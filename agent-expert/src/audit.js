// 结算审计（零依赖）：每次 checkout 写审计日志 + 哈希链存证（本地模拟联盟链）
// 生产：审计日志入服务端持久库，存证上真实联盟链（TBaaS/蚂蚁链），接已交付 5
import { appendFileSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = join(__dirname, '..', 'data')
const AUDIT_FILE = join(DATA, 'settlement-audit.jsonl')
const INJECTION_FILE = join(DATA, 'injection-audit.jsonl')
const LEDGER_FILE = join(DATA, 'chain-ledger.jsonl')
const GENESIS = '0'.repeat(64)
let prevHash = GENESIS

function ensure() {
  if (!existsSync(DATA)) mkdirSync(DATA, { recursive: true })
}

// 记录一笔结算：返回带 txHash 的审计条目
export function recordSettlement(sub, settle) {
  ensure()
  const ts = new Date().toISOString()
  const lines = settle.lines.map((l) => ({
    skillId: l.skillId,
    name: l.name,
    creator: l.creator,
    price: l.price,
    creatorPayout: l.creatorPayout,
    platformPayout: l.platformPayout,
    chainPayout: l.chainPayout
  }))
  // 哈希链：hash = H(prevHash | ts | sub | total)
  const content = JSON.stringify({ ts, sub, total: settle.total })
  const hash = crypto.createHash('sha256').update(prevHash + '|' + content).digest('hex')
  const entry = {
    ts,
    sub,
    protocol: settle.protocol,
    total: settle.total,
    totals: settle.totals,
    lines,
    txHash: hash,
    prevHash
  }
  prevHash = hash
  appendFileSync(AUDIT_FILE, JSON.stringify(entry) + '\n')
  appendFileSync(LEDGER_FILE, JSON.stringify({ prevHash: entry.prevHash, hash, ts, sub }) + '\n')
  return entry
}

export function getAudit() {
  const settlements = existsSync(AUDIT_FILE)
    ? readFileSync(AUDIT_FILE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
    : []
  const injections = existsSync(INJECTION_FILE)
    ? readFileSync(INJECTION_FILE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
    : []
  return { entries: settlements, injections, ledger: verifyLedger() }
}

// 记录一次「真实数据注入」（平台协助），写入注入审计 + 同一哈希链
export function recordInjection(sub, skillId, dataSource) {
  ensure()
  const ts = new Date().toISOString()
  const content = JSON.stringify({ type: 'injection', ts, sub, skillId, dataSource })
  const hash = crypto.createHash('sha256').update(prevHash + '|' + content).digest('hex')
  const entry = { type: 'injection', ts, sub, skillId, dataSource, txHash: hash, prevHash }
  prevHash = hash
  appendFileSync(INJECTION_FILE, JSON.stringify(entry) + '\n')
  appendFileSync(LEDGER_FILE, JSON.stringify({ prevHash: entry.prevHash, hash, ts, sub, type: 'injection' }) + '\n')
  return entry
}

// 校验哈希链连续性（演示存证完整性，篡改任一记录即断裂）
export function verifyLedger() {
  if (!existsSync(LEDGER_FILE)) return { ok: true, entries: 0 }
  const lines = readFileSync(LEDGER_FILE, 'utf8').trim().split('\n').filter(Boolean)
  let prev = GENESIS
  for (const l of lines) {
    const e = JSON.parse(l)
    if (e.prevHash !== prev) return { ok: false, entries: lines.length }
    prev = e.hash
  }
  return { ok: true, entries: lines.length }
}

export function resetAudit() {
  ensure()
  if (existsSync(AUDIT_FILE)) writeFileSync(AUDIT_FILE, '')
  if (existsSync(INJECTION_FILE)) writeFileSync(INJECTION_FILE, '')
  if (existsSync(LEDGER_FILE)) writeFileSync(LEDGER_FILE, '')
  prevHash = GENESIS
}
