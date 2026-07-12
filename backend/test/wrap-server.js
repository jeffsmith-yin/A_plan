// 测试服务器包装 — 将 server.js 的路由逻辑包装到指定端口
// 供 test/api-test.js 使用，避免 spawn 进程的 sandbox 限制

import http from 'node:http'
import { readJson, sendJson } from '../src/lib/json.js'
import { Router } from '../src/router.js'
import { register, login, signToken, authFromHeader } from '../src/auth.js'
import { rateLimit, rateLimitHeaders } from '../src/ratelimit.js'
import { getUser, getUsers, updateUser } from '../src/store/users.js'
import { getRoles, getRolesByPhone, getRoleById, saveRole, deleteRole } from '../src/store/roles.js'
import { getNDARecords, getNDAByRole, signNDA, renewNDA, getNDASignedCount } from '../src/store/nda.js'
import { listCart, addToCart, removeFromCart, clearCart, checkoutCart } from '../src/store/cart.js'
import { getOrders, createOrder, payOrder } from '../src/store/orders.js'
import { getWallet, requestWithdrawal } from '../src/store/wallet.js'
import { getDashboard } from '../src/store/dashboard.js'
import { getLedger, verifyLedger } from '../src/audit.js'
import { queryAllLedger, verifyLedger as bcVerifyLedger, getBlockchainInfo, initBlockchain } from '../src/blockchain/index.js'
import { proxyExpertRequest } from '../src/expert-proxy.js'

export async function createTestServer(port) {
  // 初始化区块链
  await initBlockchain()

  const router = new Router()

  // —— 公开端点 ——
  router.add('GET', '/api/health', () => ({ ok: true, service: '融智桥 MVP 后端', version: '0.1.0' }))

  router.add('POST', '/api/auth/register', async (_, req, res, rl) => {
    const data = await readJson(req, res)
    if (!data) return
    const r = register(data.phone, data.password, data.name)
    if (!r.ok) return sendJson(res, 400, r, rl)
    const token = signToken(r.user)
    return sendJson(res, 201, { ok: true, user: r.user, token }, rl)
  })

  router.add('POST', '/api/auth/login', async (_, req, res, rl) => {
    const data = await readJson(req, res)
    if (!data) return
    const r = login(data.phone, data.password)
    if (!r.ok) return sendJson(res, 401, r, rl)
    const token = signToken(r.user)
    return sendJson(res, 200, { ok: true, user: r.user, token }, rl)
  })

  // —— 受控端点 ——
  router.add('GET', '/api/me', (auth) => {
    const u = getUser(auth.sub)
    if (!u) return { status: 404, body: { error: '用户不存在' } }
    const roles = getRolesByPhone(auth.sub)
    return { status: 200, body: { user: u, roles } }
  }, true)

  router.add('POST', '/api/roles', async (auth, req, res, rl) => {
    const data = await readJson(req, res)
    if (!data) return
    const role = saveRole({ ...data, personPhone: auth.sub, id: data.id || 'role_' + Math.random().toString(36).slice(2, 10) })
    return sendJson(res, 200, { ok: true, role }, rl)
  }, true)

  router.add('DELETE', '/api/roles/:id', (auth, req, res, rl, params) => {
    const ok = deleteRole(params.id)
    return sendJson(res, ok ? 200 : 404, { ok }, rl)
  }, true)

  router.add('GET', '/api/nda', (auth) => {
    const roles = getRolesByPhone(auth.sub)
    const records = roles.map((r) => getNDAByRole(r.id)).filter(Boolean)
    return { status: 200, body: { records, count: records.length } }
  }, true)

  router.add('POST', '/api/nda/sign', async (auth, req, res, rl) => {
    const data = await readJson(req, res)
    if (!data) return
    const record = signNDA(data.roleId, data.signerName, data.role)
    return sendJson(res, 200, { ok: true, record }, rl)
  }, true)

  router.add('POST', '/api/nda/renew', async (auth, req, res, rl) => {
    const data = await readJson(req, res)
    if (!data) return
    const record = renewNDA(data.roleId)
    if (!record) return sendJson(res, 404, { error: 'NDA 记录不存在' }, rl)
    return sendJson(res, 200, { ok: true, record }, rl)
  }, true)

  router.add('GET', '/api/cart', (auth) => {
    return { status: 200, body: { items: listCart(auth.sub), total: listCart(auth.sub).reduce((a, ci) => a + ci.price * ci.quantity, 0) } }
  }, true)

  router.add('POST', '/api/cart/add', async (auth, req, res, rl) => {
    const data = await readJson(req, res)
    if (!data) return
    const r = addToCart(auth.sub, data.productId)
    return sendJson(res, r.ok ? 200 : 404, r, rl)
  }, true)

  router.add('POST', '/api/cart/remove', async (auth, req, res, rl) => {
    const data = await readJson(req, res)
    if (!data) return
    const r = removeFromCart(auth.sub, data.productId)
    return sendJson(res, 200, r, rl)
  }, true)

  router.add('POST', '/api/cart/checkout', async (auth, _, res, rl) => {
    const cart = checkoutCart(auth.sub)
    if (!cart.orderId) return sendJson(res, 200, cart, rl)
    const order = createOrder(auth.sub, cart.lines, cart.total)
    const paid = await payOrder(order.id, auth.sub)
    return sendJson(res, 200, { ...cart, order, paid, auditRef: paid.auditRef }, rl)
  }, true)

  router.add('GET', '/api/orders', (auth) => {
    return { status: 200, body: getOrders(auth.sub) }
  }, true)

  router.add('GET', '/api/wallet', (auth) => {
    return { status: 200, body: getWallet(auth.sub) }
  }, true)

  router.add('POST', '/api/wallet/withdraw', async (auth, req, res, rl) => {
    const data = await readJson(req, res)
    if (!data) return
    const r = requestWithdrawal(auth.sub, data.amount, data.method)
    if (!r.ok) return sendJson(res, 400, r, rl)
    return sendJson(res, 200, r, rl)
  }, true)

  router.add('GET', '/api/dashboard', () => {
    return { status: 200, body: getDashboard() }
  }, true)

  router.add('GET', '/api/audit', (auth) => {
    if (!auth.isSuperAdmin && !auth.isAdmin) return { status: 403, body: { error: 'forbidden: admin only' } }
    return { status: 200, body: { entries: getLedger(), ledger: verifyLedger() } }
  }, true)

  // 区块链适配层端点
  router.add('GET', '/api/blockchain/info', () => {
    return { status: 200, body: getBlockchainInfo() }
  }, true)

  router.add('GET', '/api/blockchain/ledger', (auth) => {
    if (!auth.isSuperAdmin && !auth.isAdmin) return { status: 403, body: { error: 'forbidden: admin only' } }
    return queryAllLedger().then(entries => ({ status: 200, body: { entries } }))
  }, true)

  router.add('GET', '/api/blockchain/verify', () => {
    return bcVerifyLedger().then(result => ({ status: 200, body: result }))
  }, true)

  // —— HTTP 服务 ——
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const url = new URL(req.url, 'http://localhost')
    const path = url.pathname

    if (path.startsWith('/api/expert/')) {
      return proxyExpertRequest(req, res)
    }

    const auth = authFromHeader(req)
    const clientId = auth?.sub || req.socket.remoteAddress || 'anon'
    const allowed = rateLimit(clientId)
    const rl = rateLimitHeaders(clientId)
    if (!allowed) {
      return sendJson(res, 429, { error: 'too many requests' }, { ...rl, 'Retry-After': String(rl['X-RateLimit-Reset']) })
    }

    const matched = router.match(req.method, path)
    if (!matched) {
      return sendJson(res, 404, { error: 'not found' }, rl)
    }

    if (matched.auth) {
      if (!auth) return sendJson(res, 401, { error: 'unauthorized' }, rl)
    }

    try {
      const result = await matched.handler(auth, req, res, rl, matched.params)
      if (result === undefined || result === null) return
      if (result.status) {
        return sendJson(res, result.status, result.body, rl)
      }
      return sendJson(res, 200, result, rl)
    } catch (e) {
      console.error('[error]', path, e.message)
      return sendJson(res, 500, { error: 'internal server error' }, rl)
    }
  })

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`测试服务器已启动：http://localhost:${port}`)
      resolve(server)
    })
  })
}
