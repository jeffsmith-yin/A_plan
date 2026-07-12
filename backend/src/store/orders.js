// 订单/结算/分账管理（零依赖）
// 订单模型：Order = {id, phone, items, total, status, createdAt, paidAt}
// 分账规则：平台 10% / 专家 60% / AI 30%
import { loadJson, saveJson } from '../lib/persist.js'
import { recordSettlement, recordSplit } from '../blockchain/index.js'
import { creditWallet, getWallet } from './wallet.js'

const FILE = 'orders.json'
const SETTLEMENT_SPLIT = { platform: 0.10, expert: 0.60, ai: 0.30 }

function load() { return loadJson(FILE, []) }
function save(o) { saveJson(FILE, o) }

export function getOrders(phone) {
  return load().filter((o) => o.phone === phone)
}

export function createOrder(phone, items, total) {
  const order = {
    id: 'ORD_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
    phone,
    items,
    total,
    status: 'pending',
    createdAt: new Date().toISOString(),
    paidAt: null
  }
  const orders = load()
  orders.push(order)
  save(orders)
  return order
}

// 支付订单 → 自动结算分账
export async function payOrder(orderId, phone) {
  const orders = load()
  const idx = orders.findIndex((o) => o.id === orderId)
  if (idx === -1) return { ok: false, error: '订单不存在' }
  if (orders[idx].status !== 'pending') return { ok: false, error: '订单状态不可支付' }

  orders[idx].status = 'paid'
  orders[idx].paidAt = new Date().toISOString()
  save(orders)

  const order = orders[idx]

  // 分账计算
  const platformAmt = Math.round(order.total * SETTLEMENT_SPLIT.platform * 100) / 100
  const expertAmt = Math.round(order.total * SETTLEMENT_SPLIT.expert * 100) / 100
  const aiAmt = Math.round((order.total - platformAmt - expertAmt) * 100) / 100 // 余数归 AI

  // 写入钱包
  creditWallet('platform_system', platformAmt, order.id, '平台分成')
  creditWallet('expert_pool', expertAmt, order.id, '专家分成')
  creditWallet('ai_pool', aiAmt, order.id, 'AI 人才分成')

  // 写审计
  const splits = [
    { role: 'platform', amount: platformAmt },
    { role: 'expert', amount: expertAmt },
    { role: 'ai', amount: aiAmt }
  ]
  await recordSettlement(phone, { orderId, total: order.total, splits })
  const audit = await recordSplit(phone, orderId, splits)

  return { ok: true, order, splits, auditRef: audit.txHash }
}

export function getOrderStats() {
  const orders = load()
  const paid = orders.filter((o) => o.status === 'paid')
  return {
    totalOrders: orders.length,
    paidOrders: paid.length,
    totalRevenue: paid.reduce((a, o) => a + o.total, 0),
    todayRevenue: paid
      .filter((o) => o.paidAt && o.paidAt.startsWith(new Date().toISOString().slice(0, 10)))
      .reduce((a, o) => a + o.total, 0)
  }
}
