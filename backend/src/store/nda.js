// NDA 管理（零依赖）
// 数据模型：NDARecord = {id, roleId, signerName, role, signedAt, expiresAt, version}
// 持久化到 data/nda.json
import { loadJson, saveJson } from '../lib/persist.js'

const FILE = 'nda.json'
const NDA_VALID_DAYS = 30

function load() { return loadJson(FILE, []) }
function save(r) { saveJson(FILE, r) }

export function getNDARecords() {
  return load()
}

export function getNDAByRole(roleId) {
  return load().find((r) => r.roleId === roleId) || null
}

export function signNDA(roleId, signerName, role) {
  const records = load()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + NDA_VALID_DAYS * 86400000).toISOString()
  const existing = records.findIndex((r) => r.roleId === roleId)
  const record = {
    id: 'nda_' + Math.random().toString(36).slice(2, 10),
    roleId,
    signerName,
    role,
    signedAt: now.toISOString(),
    expiresAt,
    version: 'v1.0'
  }
  if (existing >= 0) {
    records[existing] = record
  } else {
    records.push(record)
  }
  save(records)
  return record
}

export function renewNDA(roleId) {
  const records = load()
  const idx = records.findIndex((r) => r.roleId === roleId)
  if (idx === -1) return null
  const now = new Date()
  records[idx].signedAt = now.toISOString()
  records[idx].expiresAt = new Date(now.getTime() + NDA_VALID_DAYS * 86400000).toISOString()
  save(records)
  return records[idx]
}

export function getNDASignedCount() {
  return load().length
}
