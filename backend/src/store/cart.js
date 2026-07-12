// 购物车管理（零依赖）
// 数据模型：CartItem = {productId, name, price, quantity}
// 持久化到 data/carts.json（按 phone 隔离）
// 商品库：复用主站 demoData 的 Product 定义（简化为内置列表）
import { loadJson, saveJson } from '../lib/persist.js'

const FILE = 'carts.json'

// 演示商品库（与主站 demoData 同步）
const PRODUCTS = [
  { id: 'p1', name: '生产排产优化 DEMO', price: 199, region: '制造业' },
  { id: 'p2', name: '交期预警系统 DEMO', price: 199, region: '制造业' },
  { id: 'p3', name: '设备换型优化 DEMO', price: 199, region: '制造业' },
  { id: 'p4', name: '产能瓶颈分析 DEMO', price: 199, region: '制造业' },
  { id: 'p5', name: '缺料预警 DEMO', price: 199, region: '制造业' },
  { id: 'p6', name: '质量管理 DEMO', price: 199, region: '制造业' },
  { id: 'p7', name: '需求波动应对 DEMO', price: 199, region: '制造业' },
  { id: 'p8', name: '智能客服 DEMO', price: 149, region: '通用' },
  { id: 'p9', name: '数据分析 DEMO', price: 249, region: '通用' },
  { id: 'p10', name: '流程自动化 DEMO', price: 299, region: '通用' },
  { id: 'p11', name: 'AI 培训课件 DEMO', price: 99, region: '教育' },
  { id: 'p12', name: '直播获客 DEMO', price: 179, region: '营销' }
]

function load() { return loadJson(FILE, {}) }
function save(c) { saveJson(FILE, c) }

function getCart(phone) {
  const carts = load()
  return carts[phone] || []
}

function setCart(phone, items) {
  const carts = load()
  carts[phone] = items
  save(carts)
}

export function listCart(phone) {
  return getCart(phone).map((ci) => {
    const p = PRODUCTS.find((p) => p.id === ci.productId)
    return { ...ci, name: p?.name || '未知商品', price: ci.price || p?.price || 0 }
  })
}

export function addToCart(phone, productId) {
  const p = PRODUCTS.find((p) => p.id === productId)
  if (!p) return { ok: false, error: '商品不存在' }
  const items = getCart(phone)
  const existing = items.find((ci) => ci.productId === productId)
  if (existing) {
    existing.quantity += 1
  } else {
    items.push({ productId, quantity: 1, price: p.price })
  }
  setCart(phone, items)
  return { ok: true, item: existing || items[items.length - 1] }
}

export function removeFromCart(phone, productId) {
  const items = getCart(phone).filter((ci) => ci.productId !== productId)
  setCart(phone, items)
  return { ok: true }
}

export function clearCart(phone) {
  setCart(phone, [])
  return { ok: true }
}

export function getCartTotal(phone) {
  return getCart(phone).reduce((a, ci) => a + ci.price * ci.quantity, 0)
}

// 结算：生成订单 + 清空购物车
export function checkoutCart(phone) {
  const items = getCart(phone)
  if (items.length === 0) return { ok: true, total: 0, lines: [], orderId: null }
  const total = items.reduce((a, ci) => a + ci.price * ci.quantity, 0)
  const orderId = 'ORD_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
  clearCart(phone)
  return { ok: true, total, lines: items.map((ci) => ({ ...ci, name: PRODUCTS.find((p) => p.id === ci.productId)?.name || '' })), orderId }
}
