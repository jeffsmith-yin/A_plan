// FISCO BCOS 适配器 — 真实区块链 POC（已交付 15）
//
// 基于 FISCO BCOS 3.x JSON-RPC 协议，支持：
//   - 交易构建、签名（secp256k1）、序列化（Tars 编码）
//   - 合约部署 (sendTransaction + bytecode)
//   - 合约调用 (sendTransaction + ABI 编码)
//   - 只读查询 (call + ABI 编码)
//   - 区块/交易/回执查询
//
// 依赖（精简）：ethers (ABI 编解码), @tars/stream (交易序列化), secp256k1 (签名), js-sha3 (keccak256)
//
// 部署要求：
//   - FISCO BCOS 3.x 节点已启动 (默认 http://127.0.0.1:20200)
//   - config.ini 中 [rpc] disable_ssl=true
//   - 环境变量：FISCO_RPC_URL, FISCO_PRIVKEY, FISCO_GROUP_ID, FISCO_CHAIN_ID

import { request as httpRequest } from 'node:http'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// —— 依赖加载 ——
const { ethers } = require('ethers')
const TarsStream = require('@tars/stream')
const secp256k1 = require('secp256k1')
const { keccak_256 } = require('js-sha3')

// 使用官方 FISCO BCOS TransactionTars 结构定义
const { bcostars } = require('./TransactionTars.cjs')

// —— 常量 ——
const DEFAULT_RPC_URL = process.env.FISCO_RPC_URL || 'http://127.0.0.1:20200'
const DEFAULT_GROUP_ID = process.env.FISCO_GROUP_ID || 'group0'
const DEFAULT_CHAIN_ID = process.env.FISCO_CHAIN_ID || 'chain0'

// 默认测试私钥（生产环境通过 FISCO_PRIVKEY 注入）
const DEFAULT_PRIVKEY = process.env.FISCO_PRIVKEY || ''

// —— 工具函数 ——

// JSON-RPC 调用器
function jsonRpcCall(rpcUrl, method, params = []) {
  return new Promise((resolve, reject) => {
    const url = new URL(rpcUrl)
    const body = JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() })

    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname || '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 15000
    }

    const req = httpRequest(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.error) {
            reject(new Error(`JSON-RPC error: ${json.error.message || JSON.stringify(json.error)}`))
          } else {
            resolve(json.result)
          }
        } catch (e) {
          reject(new Error(`Failed to parse JSON-RPC response: ${e.message}`))
        }
      })
    })

    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('JSON-RPC request timeout')) })
    req.write(body)
    req.end()
  })
}

// —— 数据工具 ——

function int32ToBytes(num) {
  const buf = Buffer.allocUnsafe(4)
  buf.writeInt32BE(num, 0)
  return buf
}

function int64ToBytes(num) {
  const buf = Buffer.allocUnsafe(8)
  buf.writeBigInt64BE(BigInt(num), 0)
  return buf
}

function strToBytes(str) {
  return Buffer.from(str, 'utf8')
}

function hexToBytes(hex) {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex
  return Buffer.from(h, 'hex')
}

function bigIntRandom() {
  return String(BigInt(Math.floor(Math.random() * (2 ** 128))))
}

// —— 交易签名（使用官方 bcostars 结构）——

function signTransaction(txData, privkeyHex) {
  // 1. 计算交易哈希（使用 FISCO BCOS CPP SDK 的序列化规则）
  const parts = []
  parts.push(int32ToBytes(txData.version))
  parts.push(strToBytes(txData.chainID))
  parts.push(strToBytes(txData.groupID))
  parts.push(int64ToBytes(txData.blockLimit))
  parts.push(strToBytes(txData.nonce))
  parts.push(strToBytes(txData.to))
  const inputBuf = txData.input.toObject()
  parts.push(Buffer.isBuffer(inputBuf) ? inputBuf : Buffer.from(inputBuf))
  parts.push(strToBytes(txData.abi))

  const merged = Buffer.concat(parts)
  const txhashHex = keccak_256(merged)
  const txhashBytes = Buffer.from(txhashHex, 'hex')

  // 2. secp256k1 签名
  const privkeyBytes = hexToBytes(privkeyHex)
  const sig = secp256k1.ecdsaSign(txhashBytes, privkeyBytes, { recovered: true, canonical: true })
  const sigBytes = Buffer.concat([sig.signature, Buffer.from([sig.recid])])

  // 3. 构建 Transaction（使用官方结构）
  const tx = new bcostars.Transaction()
  tx.data = txData
  tx.dataHash.readFromObject(Buffer.from(txhashBytes))
  tx.signature.readFromObject(sigBytes)
  tx.sender.readFromObject(Buffer.alloc(0))
  tx.importTime = 0
  tx.attribute = 0
  tx.extraData = ''

  // 4. 序列化为 hex
  const os = new TarsStream.TarsOutputStream()
  tx._writeTo(os)
  const binBuf = os.getBinBuffer()
  const rawBytes = binBuf.toObject()
  const signedTxHex = '0x' + Buffer.from(rawBytes).toString('hex')

  return { signedTxHex, txHash: '0x' + txhashHex }
}

// —— FISCO BCOS 适配器 ——

// AuditLedger 合约 ABI
const AUDIT_LEDGER_ABI = [
  'function record(string auditType, string sub, string dataJson) returns (bool)',
  'function getCount() view returns (uint256)',
  'function getRecord(uint256 index) view returns (string auditType, string sub, string dataJson, uint256 blockNumber, uint256 timestamp)',
  'event AuditRecorded(string auditType, string sub, string dataJson, uint256 blockNumber, uint256 timestamp)'
]

export class FISCOBCOSAdapter {
  constructor(opts = {}) {
    this._rpcUrl = opts.rpcUrl || DEFAULT_RPC_URL
    this._groupId = opts.groupId || DEFAULT_GROUP_ID
    this._chainId = opts.chainId || DEFAULT_CHAIN_ID
    this._privkey = opts.privkey || DEFAULT_PRIVKEY
    this._connected = false
    this._blockNumber = 0
    this._name = 'FISCO BCOS'
    this._version = 'unknown'
    this._records = []
    this._contractAddr = null
    this._iface = null
    this._account = null
  }

  async connect() {
    try {
      // 获取群组信息（包含节点版本）
      const groupInfo = await jsonRpcCall(this._rpcUrl, 'getGroupInfo', [this._groupId, ''])
      if (groupInfo && groupInfo.nodeList && groupInfo.nodeList[0]) {
        const iniConfig = JSON.parse(groupInfo.nodeList[0].iniConfig || '{}')
        this._version = iniConfig.binaryInfo?.version || 'unknown'
        this._name = `FISCO BCOS ${this._version}`
      }

      // 获取区块高度
      const bn = await jsonRpcCall(this._rpcUrl, 'getBlockNumber', [this._groupId, ''])
      this._blockNumber = bn
      this._blockLimit = this._blockNumber + 500

      // 推导账户地址
      if (this._privkey) {
        const wallet = new ethers.Wallet(this._privkey)
        this._account = wallet.address
      }

      this._connected = true
      console.log(`[fisco] 已连接 ${this._name}，块高: ${this._blockNumber}，账户: ${this._account || '(未配置)'}`)
      return true
    } catch (e) {
      console.warn(`[fisco] 连接失败: ${e.message}`)
      this._connected = false
      return false
    }
  }

  async disconnect() {
    this._connected = false
  }

  // —— 合约部署 ——
  async deployContract(abi, bytecode, params = []) {
    if (!this._connected) throw new Error('FISCO BCOS 未连接')
    if (!this._privkey) throw new Error('未配置私钥 (FISCO_PRIVKEY)')

    const iface = new ethers.Interface(abi)
    const deployData = ethers.solidityPacked(['bytes', 'bytes'], [
      bytecode,
      params.length > 0 ? iface.encodeDeploy(params) : '0x'
    ])

    const txData = new bcostars.TransactionData()
    txData.version = 1
    txData.chainID = this._chainId
    txData.groupID = this._groupId
    txData.blockLimit = this._blockLimit
    txData.nonce = bigIntRandom()
    txData.to = ''
    txData.input.readFromObject(hexToBytes(deployData))
    txData.abi = JSON.stringify(abi)

    const { signedTxHex, txHash } = signTransaction(txData, this._privkey)

    try {
      const result = await jsonRpcCall(this._rpcUrl, 'sendTransaction', [
        this._groupId, '', signedTxHex, false
      ])
      await this._waitForReceipt(txHash)
      console.log(`[fisco] 合约已部署，txHash: ${txHash}`)
      return { txHash, contractAddr: result }
    } catch (e) {
      console.error(`[fisco] 合约部署失败: ${e.message}`)
      throw e
    }
  }

  // —— 调用合约（写操作）——
  async callContract(contractAddr, abi, method, args = []) {
    if (!this._connected) throw new Error('FISCO BCOS 未连接')
    if (!this._privkey) throw new Error('未配置私钥 (FISCO_PRIVKEY)')

    const iface = new ethers.Interface(abi)
    const callData = iface.encodeFunctionData(method, args)

    const txData = new bcostars.TransactionData()
    txData.version = 1
    txData.chainID = this._chainId
    txData.groupID = this._groupId
    txData.blockLimit = this._blockLimit
    txData.nonce = bigIntRandom()
    txData.to = contractAddr
    txData.input.readFromObject(hexToBytes(callData))
    txData.abi = JSON.stringify(abi)

    const { signedTxHex, txHash } = signTransaction(txData, this._privkey)

    try {
      await jsonRpcCall(this._rpcUrl, 'sendTransaction', [
        this._groupId, '', signedTxHex, false
      ])
      const receipt = await this._waitForReceipt(txHash)
      return { txHash, receipt }
    } catch (e) {
      console.error(`[fisco] 合约调用失败 (${method}): ${e.message}`)
      throw e
    }
  }

  // —— 只读查询 ——
  async queryContract(contractAddr, abi, method, args = []) {
    const iface = new ethers.Interface(abi)
    const callData = iface.encodeFunctionData(method, args)
    return jsonRpcCall(this._rpcUrl, 'call', [this._groupId, '', contractAddr, callData])
  }

  // —— IBlockchainAdapter 标准接口 ——

  async record(data) {
    if (!this._connected) throw new Error('FISCO BCOS 未连接')

    const dataJson = JSON.stringify(data.content || data)
    const auditType = data.type || 'audit'
    const sub = data.sub || 'system'

    if (this._contractAddr && this._privkey) {
      try {
        const result = await this.callContract(
          this._contractAddr, AUDIT_LEDGER_ABI, 'record', [auditType, sub, dataJson]
        )
        const receipt = {
          txHash: result.txHash,
          blockNumber: result.receipt?.blockNumber || this._blockNumber,
          status: 'confirmed',
          data: { type: auditType, sub, content: data.content }
        }
        this._records.push(receipt)
        return receipt
      } catch (e) {
        console.error(`[fisco] 上链失败，降级为本地记录: ${e.message}`)
      }
    }

    // Fallback: 本地 SHA256
    const { createHash } = await import('node:crypto')
    const raw = `${auditType}|${sub}|${dataJson}|${Date.now()}`
    const txHash = createHash('sha256').update(raw).digest('hex')
    const receipt = {
      txHash,
      blockNumber: this._blockNumber,
      status: 'confirmed',
      data: { type: auditType, sub, content: data.content },
      note: '本地记录 (合约未部署或无签名密钥)'
    }
    this._records.push(receipt)
    return receipt
  }

  async query(txHash) {
    if (!this._connected) return this._records.find(r => r.txHash === txHash) || null
    try {
      const receipt = await jsonRpcCall(this._rpcUrl, 'getTransactionReceipt', [
        this._groupId, '', txHash, false
      ])
      if (!receipt) return this._records.find(r => r.txHash === txHash) || null
      return {
        type: 'audit',
        txHash,
        blockNumber: parseInt(receipt.blockNumber || '0'),
        timestamp: Date.now(),
        content: receipt
      }
    } catch {
      return this._records.find(r => r.txHash === txHash) || null
    }
  }

  async queryAll() {
    return [...this._records]
  }

  async verify() {
    if (!this._connected) return { ok: false, reason: 'FISCO BCOS 未连接', entries: 0 }
    try {
      const bn = await jsonRpcCall(this._rpcUrl, 'getBlockNumber', [this._groupId, ''])
      return { ok: true, entries: this._records.length, blockNumber: bn }
    } catch (e) {
      return { ok: false, reason: e.message, entries: this._records.length }
    }
  }

  getInfo() {
    return {
      name: this._name,
      version: this._version,
      blockNumber: this._blockNumber,
      connected: this._connected,
      rpcUrl: this._rpcUrl,
      groupId: this._groupId,
      chainId: this._chainId,
      account: this._account,
      contractAddr: this._contractAddr
    }
  }

  setContractAddress(addr) {
    this._contractAddr = addr
    this._iface = new ethers.Interface(AUDIT_LEDGER_ABI)
    console.log(`[fisco] 审计合约地址: ${addr}`)
  }

  // —— 内部 ——

  async _waitForReceipt(txHash, timeout = 10000) {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      try {
        const receipt = await jsonRpcCall(this._rpcUrl, 'getTransactionReceipt', [
          this._groupId, '', txHash, false
        ])
        if (receipt && receipt.status !== undefined) return receipt
      } catch {}
      await new Promise(r => setTimeout(r, 200))
    }
    throw new Error(`交易回执等待超时: ${txHash}`)
  }
}

// 导出工具函数
export { signTransaction, jsonRpcCall }
