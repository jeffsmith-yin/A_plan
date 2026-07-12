// 区块链适配器管理器
// - 启动时依次尝试连接 FISCO BCOS → HashChain fallback
// - 提供统一 API，自动路由到可用后端
// - 支持运行时热切换

import { FISCOBCOSAdapter } from './fisco-adapter.js'
import { HashChainAdapter } from './hashchain-adapter.js'

let _adapter = null
let _adapterType = 'none'

// 初始化：按优先级尝试连接
export async function initBlockchain(opts = {}) {
  // 1. 尝试 FISCO BCOS
  if (opts.fiscoUrl || process.env.FISCO_RPC_URL) {
    const fisco = new FISCOBCOSAdapter({ rpcUrl: opts.fiscoUrl || process.env.FISCO_RPC_URL })
    const ok = await fisco.connect()
    if (ok) {
      _adapter = fisco
      _adapterType = 'fisco'
      console.log('[blockchain] 使用 FISCO BCOS 适配器')
      return _adapter
    }
  }

  // 2. Fallback: HashChain
  const hashchain = new HashChainAdapter()
  await hashchain.connect()
  _adapter = hashchain
  _adapterType = 'hashchain'
  console.log('[blockchain] 使用 HashChain 适配器 (fallback)')
  return _adapter
}

// 手动设置适配器
export function setAdapter(adapter, type) {
  _adapter = adapter
  _adapterType = type || 'custom'
}

// 获取当前适配器
export function getAdapter() {
  return _adapter
}

// 获取适配器类型
export function getAdapterType() {
  return _adapterType
}

// —— 统一 API（代理到当前适配器）——

export async function recordSettlement(sub, settleData) {
  if (!_adapter) throw new Error('区块链未初始化')
  return _adapter.record({
    type: 'settlement',
    sub,
    content: settleData,
    timestamp: Date.now()
  })
}

export async function recordSplit(sub, orderId, splits) {
  if (!_adapter) throw new Error('区块链未初始化')
  return _adapter.record({
    type: 'split',
    sub,
    orderId,
    content: splits,
    timestamp: Date.now()
  })
}

export async function recordAudit(data) {
  if (!_adapter) throw new Error('区块链未初始化')
  return _adapter.record({
    type: 'audit',
    ...data,
    timestamp: Date.now()
  })
}

export async function queryLedger(txHash) {
  if (!_adapter) throw new Error('区块链未初始化')
  return _adapter.query(txHash)
}

export async function queryAllLedger() {
  if (!_adapter) throw new Error('区块链未初始化')
  return _adapter.queryAll()
}

export async function verifyLedger() {
  if (!_adapter) throw new Error('区块链未初始化')
  return _adapter.verify()
}

export function getBlockchainInfo() {
  if (!_adapter) return { name: 'none', connected: false }
  return _adapter.getInfo()
}
