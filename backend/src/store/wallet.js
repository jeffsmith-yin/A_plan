// 钱包管理（零依赖）
// Wallet = {phone, balance, entries: [{amount, orderId, note, createdAt}], withdrawals: [{amount, method, status, createdAt}]}
import { loadJson, saveJson } from '../lib/persist.js'

const FILE = 'wallets.json'

function load() { return loadJson(FILE, {}) }
function save(w) { saveJson(FILE, w) }

function ensureWallet(phone) {
  const wallets = load()
  if (!wallets[phone]) {
    wallets[phone] = { phone, balance: 0, entries: [], withdrawals: [] }
    save(wallets)
  }
  return wallets[phone]
}

export function getWallet(phone) {
  return ensureWallet(phone)
}

export function creditWallet(phone, amount, orderId, note) {
  const wallets = load()
  const w = wallets[phone] || { phone, balance: 0, entries: [], withdrawals: [] }
  w.balance = Math.round((w.balance + amount) * 100) / 100
  w.entries.push({ amount, orderId, note, createdAt: new Date().toISOString() })
  wallets[phone] = w
  save(wallets)
  return w
}

export function requestWithdrawal(phone, amount, method) {
  const wallets = load()
  const w = wallets[phone]
  if (!w) return { ok: false, error: '钱包不存在' }
  if (amount > w.balance) return { ok: false, error: '余额不足' }
  w.balance = Math.round((w.balance - amount) * 100) / 100
  w.withdrawals.push({ amount, method, status: '处理中', createdAt: new Date().toISOString() })
  wallets[phone] = w
  save(wallets)
  return { ok: true, wallet: w }
}
