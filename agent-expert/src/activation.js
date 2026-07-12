// 技能包激活态存储（零依赖）：按 (sub, skillId) 记录 演示态/激活态
// 购买（结算）后状态为 'demo'；平台协助注入真实数据后翻为 'activated'
// 持久化到 data/activations.json，重启可恢复（生产接后端用户库）
import { loadKB } from './rag.js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = join(__dirname, '..', 'data')
const FILE = join(DATA, 'activations.json')
const store = {} // sub -> { skillId: { state, purchasedAt, injectedAt, dataSource, bindingId } }

function ensure() {
  if (!existsSync(DATA)) mkdirSync(DATA, { recursive: true })
}
function load() {
  ensure()
  if (existsSync(FILE)) {
    try {
      Object.assign(store, JSON.parse(readFileSync(FILE, 'utf8')))
    } catch {}
  }
}
function save() {
  ensure()
  writeFileSync(FILE, JSON.stringify(store))
}
load()

// 购买（结算）后登记所有权：状态置 'demo'（已激活的保持不变）
export function recordPurchase(sub, skillIds) {
  if (!store[sub]) store[sub] = {}
  const now = new Date().toISOString()
  for (const id of skillIds) {
    const cur = store[sub][id]
    if (cur && cur.state === 'activated') continue
    store[sub][id] = {
      state: 'demo',
      purchasedAt: now,
      injectedAt: cur?.injectedAt || null,
      dataSource: cur?.dataSource || null,
      bindingId: cur?.bindingId || null
    }
  }
  save()
}

export function isPurchased(sub, skillId) {
  return !!store[sub]?.[skillId]
}

export function getState(sub, skillId) {
  const e = store[sub]?.[skillId]
  return e?.state || 'none' // none = 未购买/未拥有
}

export function getBinding(sub, skillId) {
  return store[sub]?.[skillId] || null
}

export function listActivations(sub) {
  const o = store[sub] || {}
  return Object.entries(o).map(([skillId, e]) => ({ skillId, ...e }))
}

export function setActivated(sub, skillId, dataSource) {
  if (!store[sub]) store[sub] = {}
  const now = new Date().toISOString()
  const cur = store[sub][skillId] || {}
  const bindingId = cur.bindingId || 'bind_' + Math.random().toString(36).slice(2, 10)
  store[sub][skillId] = {
    state: 'activated',
    purchasedAt: cur.purchasedAt || now,
    injectedAt: now,
    dataSource,
    bindingId
  }
  save()
  return store[sub][skillId]
}

// 状态文案（供 CLI / UI 复用）
export const STATE_LABEL = {
  none: '未拥有',
  demo: '演示态(已购)',
  activated: '激活态(已注入真实数据)'
}

export function resetActivations() {
  ensure()
  if (existsSync(FILE)) writeFileSync(FILE, '{}')
  for (const k of Object.keys(store)) delete store[k]
}
