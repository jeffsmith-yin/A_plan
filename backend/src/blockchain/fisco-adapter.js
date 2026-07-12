// FISCO BCOS 适配器 — 基于 JSON-RPC 协议的轻量客户端（零额外依赖）
//
// 协议：FISCO BCOS JSON-RPC (https://fisco-bcos-doc.readthedocs.io/)
// 测试：需要本地/远程 FISCO BCOS 节点（Air 版本或标准版本）
//
// 核心 RPC 方法：
//   - eth_blockNumber          : 获取当前区块高度
//   - eth_sendRawTransaction   : 发送已签名交易
//   - eth_getTransactionReceipt: 查询交易回执
//   - eth_call                 : 只读调用合约
//   - getClientVersion         : 获取节点版本
//
// 合约设计：
//   AuditLedger.sol — 轻量审计账本合约
//   - record(string type, string sub, string dataJson) → txHash
//   - query(bytes32 txHash) → (type, sub, dataJson, blockNumber, timestamp)
//   - getCount() → uint256

import { request as httpRequest } from 'node:http'

const DEFAULT_RPC_URL = process.env.FISCO_RPC_URL || 'http://127.0.0.1:8545'
const DEFAULT_GROUP_ID = parseInt(process.env.FISCO_GROUP_ID || '1', 10)
const DEFAULT_CHAIN_ID = parseInt(process.env.FISCO_CHAIN_ID || '1', 10)

// 简易 JSON-RPC 调用器
function jsonRpcCall(rpcUrl, method, params = []) {
  return new Promise((resolve, reject) => {
    const url = new URL(rpcUrl)
    const body = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now()
    })

    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname || '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 10000
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
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('JSON-RPC request timeout'))
    })

    req.write(body)
    req.end()
  })
}

export class FISCOBCOSAdapter {
  constructor(opts = {}) {
    this._rpcUrl = opts.rpcUrl || DEFAULT_RPC_URL
    this._groupId = opts.groupId || DEFAULT_GROUP_ID
    this._chainId = opts.chainId || DEFAULT_CHAIN_ID
    this._connected = false
    this._blockNumber = 0
    this._name = 'FISCO BCOS'
    this._version = 'unknown'
    this._records = [] // 本地缓存链上记录
  }

  async connect() {
    try {
      // 测试连通性：获取节点版本
      const version = await jsonRpcCall(this._rpcUrl, 'getClientVersion')
      this._version = version['FISCO-BCOS Version'] || version['Supported Version'] || 'unknown'
      this._name = `FISCO BCOS ${this._version}`

      // 获取当前区块高度
      const blockNumberHex = await jsonRpcCall(this._rpcUrl, 'eth_blockNumber', [this._groupId])
      this._blockNumber = parseInt(blockNumberHex, 16)
      this._connected = true

      console.log(`[fisco] 已连接 ${this._name}，当前区块高度: ${this._blockNumber}`)
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

  // 上链：调用 AuditLedger.record(type, sub, dataJson)
  async record(data) {
    if (!this._connected) throw new Error('FISCO BCOS 未连接')

    // 构造交易数据
    // 在实际部署中，这里会调用已部署的 AuditLedger 合约
    // 目前使用 eth_sendRawTransaction 的占位实现
    // 合约 ABI 编码的简化版本
    const dataJson = JSON.stringify(data.content || data)
    const txHash = await this._sendAuditTransaction(data.type || 'audit', data.sub || 'system', dataJson)

    const receipt = {
      txHash,
      blockNumber: this._blockNumber,
      status: 'confirmed',
      data: { type: data.type, sub: data.sub, content: data.content }
    }

    this._records.push(receipt)
    return receipt
  }

  async query(txHash) {
    // 使用 eth_getTransactionReceipt 查询
    try {
      const receipt = await jsonRpcCall(this._rpcUrl, 'eth_getTransactionReceipt', [this._groupId, txHash])
      if (!receipt) return null

      return {
        type: 'audit',
        txHash,
        blockNumber: parseInt(receipt.blockNumber, 16),
        timestamp: Date.now(),
        content: receipt
      }
    } catch {
      // fallback: 从本地缓存查找
      return this._records.find(r => r.txHash === txHash) || null
    }
  }

  async queryAll() {
    return [...this._records]
  }

  async verify() {
    if (!this._connected) return { ok: false, reason: 'FISCO BCOS 未连接', entries: 0 }

    try {
      const blockNumberHex = await jsonRpcCall(this._rpcUrl, 'eth_blockNumber', [this._groupId])
      const currentBlock = parseInt(blockNumberHex, 16)
      return {
        ok: true,
        entries: this._records.length,
        blockNumber: currentBlock
      }
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
      groupId: this._groupId
    }
  }

  // —— 内部方法 ——

  // 发送审计交易（占位实现：通过 eth_call 模拟 + 本地记录）
  // 完整实现需要：
  //   1. 部署 AuditLedger.sol 合约
  //   2. 使用合约 ABI 编码 call data
  //   3. 签名交易（需要私钥管理）
  //   4. 通过 eth_sendRawTransaction 发送
  async _sendAuditTransaction(type, sub, dataJson) {
    // 占位：生成模拟 txHash
    // 实际部署后替换为 eth_sendRawTransaction 调用
    const { createHash } = await import('node:crypto')
    const raw = `${type}|${sub}|${dataJson}|${Date.now()}`
    const txHash = '0x' + createHash('sha256').update(raw).digest('hex')
    return txHash
  }

  // 部署合约（未来实现）
  async deployContract(abi, bytecode, params = []) {
    if (!this._connected) throw new Error('FISCO BCOS 未连接')
    // TODO: 实现合约部署逻辑
    throw new Error('合约部署功能待实现（需要私钥签名）')
  }
}
