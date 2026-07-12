// 购物车 + 按创建人（自然人/智能体）拟定分成的结算层
// 隔离：按 sessionId（鉴权后的 sub）区分购物车，杜绝多用户串号
// 持久化：落盘到 data/cart-store.json，重启后可恢复（生产接后端/用户库）
import { loadKB } from './rag.js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = join(__dirname, '..', 'data')
const CART_FILE = join(DATA, 'cart-store.json')

// 标准分成（同「透明智能分账协议」）：创建人 ~80% / 平台 take rate 18%(区间10–20%) / 链上清算 2%(区间1–3%)
const DEFAULT_SHARE = { creator: 0.80, platform: 0.18, chain: 0.02 }

const store = new Map() // sessionId -> { items: [] }

function ensure() {
  if (!existsSync(DATA)) mkdirSync(DATA, { recursive: true })
}
function loadStore() {
  ensure()
  if (existsSync(CART_FILE)) {
    try {
      const o = JSON.parse(readFileSync(CART_FILE, 'utf8'))
      for (const [k, v] of Object.entries(o)) store.set(k, v)
    } catch {}
  }
}
function saveStore() {
  ensure()
  const o = {}
  for (const [k, v] of store) o[k] = v
  writeFileSync(CART_FILE, JSON.stringify(o))
}
loadStore()

function itemsOf(sessionId) {
  if (!store.has(sessionId)) store.set(sessionId, { items: [] })
  return store.get(sessionId).items
}

export function addToCart(skillId, sessionId = 'default') {
  const kb = loadKB()
  if (!kb.skills.some((s) => s.id === skillId)) return false // 不存在的技能包拒收
  const items = itemsOf(sessionId)
  if (items.includes(skillId)) return false // 已存在则去重
  items.push(skillId)
  saveStore()
  return true
}

export function removeFromCart(skillId, sessionId = 'default') {
  const items = itemsOf(sessionId)
  const before = items.length
  store.set(sessionId, { items: items.filter((id) => id !== skillId) })
  saveStore()
  return items.length !== before
}

export function listCart(kb, sessionId = 'default') {
  return itemsOf(sessionId).map((id) => kb.skills.find((s) => s.id === id)).filter(Boolean)
}

export function clearCart(sessionId = 'default') {
  store.set(sessionId, { items: [] })
  saveStore()
}

// 结算：返回每笔技能包的创建人/平台/链上分账，以及合计（按 sessionId 隔离）
export function checkout(kb, sessionId = 'default') {
  const lines = itemsOf(sessionId)
    .map((id) => kb.skills.find((s) => s.id === id))
    .filter(Boolean)
    .map((s) => {
      const share = s.share || DEFAULT_SHARE
      const price = s.listPrice || 0
      const creator = price * share.creator
      const platform = price * share.platform
      const chain = price * share.chain
      return {
        skillId: s.id,
        name: s.name,
        creator: s.creator, // { type:'person'|'agent', name }
        price,
        creatorPayout: Number(creator.toFixed(2)),
        platformPayout: Number(platform.toFixed(2)),
        chainPayout: Number(chain.toFixed(2))
      }
    })

  const total = lines.reduce((a, l) => a + l.price, 0)
  const creatorTotal = Number(lines.reduce((a, l) => a + l.creatorPayout, 0).toFixed(2))
  const platformTotal = Number(lines.reduce((a, l) => a + l.platformPayout, 0).toFixed(2))
  const chainTotal = Number(lines.reduce((a, l) => a + l.chainPayout, 0).toFixed(2))

  return {
    protocol: '透明智能分账协议',
    settlement: '2-of-3 多签 + 人民币法币结算（联盟链测试网模拟）',
    total: Number(total.toFixed(2)),
    lines,
    totals: { creatorTotal, platformTotal, chainTotal },
    note: '创建人为自然人 → 归属该专家；为智能体 → 归属其运营/AI 人才方。平台 take rate 18%（区间 10–20%），链上清算费 2%（区间 1–3%）。'
  }
}
