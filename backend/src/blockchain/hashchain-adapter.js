// HashChain 适配器 — 将现有 SHA256 hash-chain 封装为 IBlockchainAdapter
// 零依赖，本地文件持久化，始终可用（作为 fallback 后端）

import { createHash } from 'node:crypto'
import { appendFileSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { dataPath, ensureDataDir } from '../lib/persist.js'

const LEDGER_FILE = 'chain-ledger.jsonl'
const GENESIS = '0'.repeat(64)

function sha256(s) {
  return createHash('sha256').update(s, 'utf8').digest('hex')
}

export class HashChainAdapter {
  constructor() {
    this._connected = true
    this._blockNumber = 0
    this._name = 'HashChain (SHA256)'
    this._version = '1.0.0'
  }

  async connect() {
    ensureDataDir()
    this._connected = true
    // 计算当前区块高度
    const p = dataPath(LEDGER_FILE)
    if (existsSync(p)) {
      const lines = readFileSync(p, 'utf8').trim().split('\n').filter(Boolean)
      this._blockNumber = lines.length
    }
    return true
  }

  async disconnect() {
    this._connected = false
  }

  async record(data) {
    ensureDataDir()
    const prev = this._getLastHash()
    const content = JSON.stringify({ type: data.type || 'audit', ...data, timestamp: data.timestamp || Date.now() })
    const hash = sha256(prev + content)
    const entry = { prevHash: prev, ...JSON.parse(content), hash }
    appendFileSync(dataPath(LEDGER_FILE), JSON.stringify(entry) + '\n', 'utf8')
    this._blockNumber++
    return {
      txHash: hash,
      blockNumber: this._blockNumber,
      status: 'confirmed',
      data: entry
    }
  }

  async query(txHash) {
    const all = await this.queryAll()
    return all.find(e => e.txHash === txHash) || null
  }

  async queryAll() {
    const p = dataPath(LEDGER_FILE)
    if (!existsSync(p)) return []
    return readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map(line => {
      const r = JSON.parse(line)
      return {
        type: r.type,
        txHash: r.hash,
        blockNumber: 0, // hash-chain 没有真实区块高度
        timestamp: new Date(r.timestamp).getTime(),
        content: r
      }
    })
  }

  async verify() {
    const p = dataPath(LEDGER_FILE)
    if (!existsSync(p)) return { ok: true, entries: 0 }
    const lines = readFileSync(p, 'utf8').trim().split('\n').filter(Boolean)
    if (lines.length === 0) return { ok: true, entries: 0 }
    let prev = GENESIS
    for (let i = 0; i < lines.length; i++) {
      const r = JSON.parse(lines[i])
      if (r.prevHash !== prev) {
        return { ok: false, entries: i, reason: `prevHash mismatch at entry ${i}` }
      }
      prev = r.hash
    }
    return { ok: true, entries: lines.length }
  }

  getInfo() {
    return {
      name: this._name,
      version: this._version,
      blockNumber: this._blockNumber,
      connected: this._connected
    }
  }

  // —— 内部 ——
  _getLastHash() {
    const p = dataPath(LEDGER_FILE)
    if (!existsSync(p)) return GENESIS
    const lines = readFileSync(p, 'utf8').trim().split('\n')
    if (lines.length === 0 || lines[0] === '') return GENESIS
    try {
      return JSON.parse(lines[lines.length - 1]).hash
    } catch {
      return GENESIS
    }
  }

  // 兼容旧审计模块 API
  recordSettlement(sub, settleData) {
    return this.record({ type: 'settlement', sub, ...settleData })
  }

  recordSplit(sub, orderId, splits) {
    return this.record({ type: 'split', sub, orderId, splits })
  }
}
