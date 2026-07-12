// 哈希链审计账本（复用 agent-expert 模式，零依赖）
// 每笔记录 hash = SHA256(prevHash | JSON.stringify(content))
// GENESIS = "0".repeat(64)，链断裂 = 被篡改
import { createHash } from 'node:crypto'
import { appendFileSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { dataPath, ensureDataDir } from './lib/persist.js'

const LEDGER_FILE = 'chain-ledger.jsonl'
const GENESIS = '0'.repeat(64)

function sha256(s) {
  return createHash('sha256').update(s, 'utf8').digest('hex')
}

function getLastHash() {
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

function appendEntry(entry) {
  ensureDataDir()
  const prev = getLastHash()
  const content = JSON.stringify(entry)
  const hash = sha256(prev + content)
  const record = JSON.stringify({ prevHash: prev, ...entry, hash }) + '\n'
  appendFileSync(dataPath(LEDGER_FILE), record, 'utf8')
  return { txHash: hash, entry }
}

// 结算审计
export function recordSettlement(sub, settleData) {
  return appendEntry({ type: 'settlement', sub, ...settleData, timestamp: new Date().toISOString() })
}

// 分账审计
export function recordSplit(sub, orderId, splits) {
  return appendEntry({ type: 'split', sub, orderId, splits, timestamp: new Date().toISOString() })
}

// 链完整性验证：仅验证 prevHash 链的连续性（不重新序列化条目内容）
export function verifyLedger() {
  const p = dataPath(LEDGER_FILE)
  if (!existsSync(p)) return { ok: true, entries: 0 }
  const lines = readFileSync(p, 'utf8').trim().split('\n').filter(Boolean)
  if (lines.length === 0) return { ok: true, entries: 0 }
  let prev = GENESIS
  const entries = []
  for (let i = 0; i < lines.length; i++) {
    const r = JSON.parse(lines[i])
    if (r.prevHash !== prev) return { ok: false, reason: `prevHash mismatch at entry ${i}`, entries: i }
    prev = r.hash
    entries.push(r)
  }
  return { ok: true, entries: entries.length }
}

// 读取全部审计
export function getLedger() {
  const p = dataPath(LEDGER_FILE)
  if (!existsSync(p)) return []
  return readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
}

// 重置
export function resetLedger() {
  const p = dataPath(LEDGER_FILE)
  if (existsSync(p)) writeFileSync(p, '')
}
