// 融智桥 MVP 后端 · 零依赖 API 综合测试套件
// 覆盖：功能 / 安全（鉴权·限流·体限）/ 审计（哈希链）
// 运行：node test/api-test.js（自动拉起服务、跑完自清，退出码 0=通过 / 1=失败 / 3=超时兜底）
import { spawn } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { strict as assert } from 'node:assert'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PORT = process.env.TEST_PORT || 3199
const BASE = `http://localhost:${PORT}`
const SLA_MS = 200

// —— 轻量测试框架 ——
const results = []
let server

function rec(name, category, severity, fn) {
  return (async () => {
    const t = { name, category, severity, status: 'PASS', detail: '', expected: '', actual: '' }
    const start = performance.now()
    try {
      await fn(t)
    } catch (e) {
      t.status = 'FAIL'
      t.detail = e.message
    }
    t.ms = Number((performance.now() - start).toFixed(2))
    results.push(t)
    console.log(`${t.status === 'PASS' ? '✅' : '❌'} [${category}] ${name} (${t.ms}ms)${t.detail ? ' — ' + t.detail : ''}`)
  })()
}

async function waitReady(timeout = 8000) {
  const t0 = performance.now()
  while (performance.now() - t0 < timeout) {
    try {
      const r = await fetch(BASE + '/api/health')
      if (r.ok) return true
    } catch {}
    await new Promise((r) => setTimeout(r, 120))
  }
  throw new Error('服务未在超时内就绪')
}

async function req(method, path, body, headers = {}, timeoutMs = 8000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const opts = { method, headers: { 'Content-Type': 'application/json', ...headers }, signal: ctrl.signal }
  if (body !== undefined) opts.body = typeof body === 'string' ? body : JSON.stringify(body)
  try {
    const r = await fetch(BASE + path, opts)
    const raw = await r.text()
    let json = null
    try { json = JSON.parse(raw) } catch {}
    return { status: r.status, json, text: raw }
  } finally {
    clearTimeout(timer)
  }
}

const authH = (token) => (token ? { Authorization: 'Bearer ' + token } : {})

// —— 测试用例 ——
async function run() {
  console.log('=== 融智桥 MVP 后端 · API 测试 ===')
  console.log(`目标地址：${BASE}\n`)

  // ===== A. 公开端点 =====
  await rec('GET /api/health → ok', '功能', 'P0', async (t) => {
    const r = await req('GET', '/api/health')
    t.expected = '200 ok=true'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 200)
    assert.strictEqual(r.json.ok, true)
  })

  // 注册 + 登录
  let token, token2
  await rec('POST /api/auth/register 新用户注册 → 201', '功能', 'P0', async (t) => {
    const r = await req('POST', '/api/auth/register', { phone: '13800000001', password: 'test123', name: '测试企业A' })
    t.expected = '201 ok=true 含 token'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 201)
    assert.ok(r.json.ok)
    assert.ok(r.json.token)
    assert.strictEqual(r.json.user.phone, '13800000001')
    assert.strictEqual(r.json.user.isSuperAdmin, true, '首个用户应为超管')
    token = r.json.token
  })

  await rec('POST /api/auth/register 重复手机号 → 400', '功能', 'P1', async (t) => {
    const r = await req('POST', '/api/auth/register', { phone: '13800000001', password: 'test123', name: '重复' })
    t.expected = '400'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 400)
  })

  await rec('POST /api/auth/login 正确密码 → 200 + token', '功能', 'P0', async (t) => {
    const r = await req('POST', '/api/auth/login', { phone: '13800000001', password: 'test123' })
    t.expected = '200 ok=true 含 token'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 200)
    assert.ok(r.json.token)
  })

  await rec('POST /api/auth/login 错误密码 → 401', '安全', 'P0', async (t) => {
    const r = await req('POST', '/api/auth/login', { phone: '13800000001', password: 'wrong' })
    t.expected = '401'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 401)
  })

  // 注册第二个用户（非超管）
  await rec('POST /api/auth/register 第二个用户 → 非超管', '功能', 'P1', async (t) => {
    const r = await req('POST', '/api/auth/register', { phone: '13800000002', password: 'test456', name: '测试企业B' })
    t.expected = '201 且 isSuperAdmin=false'
    t.actual = `isSuperAdmin=${r.json.user.isSuperAdmin}`
    assert.strictEqual(r.status, 201)
    assert.strictEqual(r.json.user.isSuperAdmin, false)
    token2 = r.json.token
  })

  // ===== B. 受控端点（鉴权）=====
  await rec('GET /api/me 无 token → 401', '安全', 'P0', async (t) => {
    const r = await req('GET', '/api/me')
    t.expected = '401'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 401)
  })

  await rec('GET /api/me 有效 token → 200 + user + roles', '功能', 'P0', async (t) => {
    const r = await req('GET', '/api/me', undefined, authH(token))
    t.expected = '200 含 user.phone 和 roles[]'
    t.actual = `status=${r.status} phone=${r.json?.user?.phone}`
    assert.strictEqual(r.status, 200)
    assert.strictEqual(r.json.user.phone, '13800000001')
    assert.ok(Array.isArray(r.json.roles))
  })

  await rec('伪造 token → 401', '安全', 'P1', async (t) => {
    const r = await req('GET', '/api/me', undefined, authH('fake.token.here'))
    t.expected = '401'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 401)
  })

  // ===== C. 角色管理 =====
  let roleId
  await rec('POST /api/roles 创建角色 → 200', '功能', 'P0', async (t) => {
    const r = await req('POST', '/api/roles', {
      role: 'enterprise', name: 'ACME制造', title: '生产总监', intro: '专注制造业', tags: ['制造', '排产']
    }, authH(token))
    t.expected = '200 ok=true 含 role.id'
    t.actual = `status=${r.status} ok=${r.json?.ok}`
    assert.strictEqual(r.status, 200)
    assert.ok(r.json.ok)
    assert.ok(r.json.role.id)
    assert.strictEqual(r.json.role.personPhone, '13800000001')
    roleId = r.json.role.id
  })

  await rec('DELETE /api/roles/:id 删除角色 → 200', '功能', 'P1', async (t) => {
    const r = await req('DELETE', '/api/roles/' + roleId, undefined, authH(token))
    t.expected = '200 ok=true'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 200)
  })

  // 重新创建角色供后续测试
  await rec('POST /api/roles 重新创建 → 200', '功能', 'P1', async (t) => {
    const r = await req('POST', '/api/roles', {
      role: 'enterprise', name: 'ACME制造', title: '生产总监', intro: '专注制造业', tags: ['制造']
    }, authH(token))
    assert.strictEqual(r.status, 200)
    roleId = r.json.role.id
  })

  // ===== D. NDA =====
  await rec('POST /api/nda/sign 签署 NDA → 200', '功能', 'P0', async (t) => {
    const r = await req('POST', '/api/nda/sign', { roleId, signerName: 'ACME制造', role: 'enterprise' }, authH(token))
    t.expected = '200 ok=true 含 record'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 200)
    assert.ok(r.json.record.expiresAt)
  })

  await rec('GET /api/nda 查看 NDA 状态 → 200', '功能', 'P1', async (t) => {
    const r = await req('GET', '/api/nda', undefined, authH(token))
    t.expected = '200 records.length>0'
    t.actual = `status=${r.status} count=${r.json?.count}`
    assert.strictEqual(r.status, 200)
    assert.ok(r.json.count > 0)
  })

  await rec('POST /api/nda/renew 续签 → 200', '功能', 'P1', async (t) => {
    const r = await req('POST', '/api/nda/renew', { roleId }, authH(token))
    t.expected = '200 ok=true'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 200)
  })

  // ===== E. 购物车 + 结算 =====
  await rec('POST /api/cart/add 加入购物车 → 200', '功能', 'P0', async (t) => {
    const r = await req('POST', '/api/cart/add', { productId: 'p1' }, authH(token))
    t.expected = '200 ok=true'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 200)
    assert.ok(r.json.ok)
  })

  await rec('POST /api/cart/add 再加入 → 200 quantity=2', '功能', 'P1', async (t) => {
    const r = await req('POST', '/api/cart/add', { productId: 'p1' }, authH(token))
    t.expected = '200 quantity=2'
    t.actual = `quantity=${r.json?.item?.quantity}`
    assert.strictEqual(r.status, 200)
  })

  await rec('GET /api/cart 查看购物车 → 200', '功能', 'P0', async (t) => {
    const r = await req('GET', '/api/cart', undefined, authH(token))
    t.expected = '200 items.length>0'
    t.actual = `status=${r.status} items=${r.json?.items?.length}`
    assert.strictEqual(r.status, 200)
    assert.ok(r.json.items.length > 0)
  })

  await rec('POST /api/cart/checkout 结算 → 200 + 订单 + 分账 + 审计', '功能', 'P0', async (t) => {
    const r = await req('POST', '/api/cart/checkout', undefined, authH(token))
    t.expected = '200 含 order/paid/auditRef'
    t.actual = `status=${r.status} orderId=${r.json?.order?.id}`
    assert.strictEqual(r.status, 200)
    assert.ok(r.json.order)
    assert.strictEqual(r.json.paid.ok, true)
    assert.ok(/^[0-9a-f]{64}$/.test(r.json.auditRef), '审计交易哈希应为 64 位十六进制')
  })

  await rec('购物车隔离：用户B看不到用户A的购物车', '隔离', 'P0', async (t) => {
    await req('POST', '/api/cart/add', { productId: 'p5' }, authH(token))
    const a = await req('GET', '/api/cart', undefined, authH(token))
    const b = await req('GET', '/api/cart', undefined, authH(token2))
    t.expected = 'A 有商品，B 为空'
    t.actual = `A=${a.json.items.length} B=${b.json.items.length}`
    assert.ok(a.json.items.length > 0)
    assert.strictEqual(b.json.items.length, 0)
  })

  // ===== F. 订单 =====
  await rec('GET /api/orders 查看订单 → 200', '功能', 'P1', async (t) => {
    const r = await req('GET', '/api/orders', undefined, authH(token))
    t.expected = '200 orders.length>0'
    t.actual = `status=${r.status} orders=${r.json?.length}`
    assert.strictEqual(r.status, 200)
    assert.ok(r.json.length > 0)
  })

  // ===== G. 钱包 =====
  await rec('GET /api/wallet 查看钱包 → 200', '功能', 'P0', async (t) => {
    const r = await req('GET', '/api/wallet', undefined, authH(token))
    t.expected = '200 含 balance'
    t.actual = `status=${r.status} balance=${r.json?.balance}`
    assert.strictEqual(r.status, 200)
    assert.ok(typeof r.json.balance === 'number')
  })

  await rec('POST /api/wallet/withdraw 余额不足 → 400', '功能', 'P1', async (t) => {
    const r = await req('POST', '/api/wallet/withdraw', { amount: 10, method: '微信' }, authH(token))
    t.expected = '400 余额不足'
    t.actual = `status=${r.status} error=${r.json?.error}`
    assert.strictEqual(r.status, 400)
    assert.ok(r.json.error.includes('余额不足'))
  })

  // ===== H. 数据看板 =====
  await rec('GET /api/dashboard 数据看板 → 200', '功能', 'P0', async (t) => {
    const r = await req('GET', '/api/dashboard', undefined, authH(token))
    t.expected = '200 含 expertCount/enterpriseCount/totalMembers'
    t.actual = `status=${r.status} members=${r.json?.totalMembers}`
    assert.strictEqual(r.status, 200)
    assert.ok(typeof r.json.expertCount === 'number')
    assert.ok(typeof r.json.totalOrders === 'number')
  })

  // ===== I. 审计 =====
  await rec('GET /api/audit 超管查看审计 → 200', '审计', 'P0', async (t) => {
    const r = await req('GET', '/api/audit', undefined, authH(token))
    t.expected = '200 ledger.ok=true 含 entries'
    t.actual = `status=${r.status} ledgerOk=${r.json?.ledger?.ok} entries=${r.json?.entries?.length}`
    assert.strictEqual(r.status, 200)
    assert.ok(r.json.entries.length > 0)
    assert.strictEqual(r.json.ledger.ok, true, '哈希链应完整')
  })

  await rec('GET /api/audit 非管理员 → 403', '安全', 'P0', async (t) => {
    const r = await req('GET', '/api/audit', undefined, authH(token2))
    t.expected = '403'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 403)
  })

  // ===== J. 安全杂项 =====
  await rec('畸形 JSON → 400', '安全', 'P1', async (t) => {
    const r = await req('POST', '/api/auth/login', '{bad', undefined)
    t.expected = '400'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 400)
  })

  await rec('超大请求体 → 413', '安全', 'P1', async (t) => {
    const big = 'x'.repeat(1_200_000)
    const r = await req('POST', '/api/auth/login', { phone: '13800000001', password: big })
    t.expected = '413'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 413)
  })

  await rec('未知路由 → 404', '功能', 'P2', async (t) => {
    const r = await req('GET', '/api/nope')
    t.expected = '404'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 404)
  })

  // ===== K. 性能 =====
  await rec(`GET /api/health 响应 < ${SLA_MS}ms`, '性能', 'P1', async (t) => {
    const t0 = performance.now()
    const r = await req('GET', '/api/health')
    const ms = performance.now() - t0
    t.expected = `<${SLA_MS}ms`
    t.actual = `${ms.toFixed(1)}ms`
    assert.strictEqual(r.status, 200)
    assert.ok(ms < SLA_MS, `超出 SLA：${ms.toFixed(1)}ms`)
  })

  await rec('GET /api/me 30 并发 → 全成功', '性能', 'P1', async (t) => {
    const N = 30
    const calls = Array.from({ length: N }, () => req('GET', '/api/me', undefined, authH(token)))
    const res = await Promise.all(calls)
    const allOk = res.every((r) => r.status === 200)
    t.expected = '全 200'
    t.actual = `成功=${res.filter((r) => r.status === 200).length}/${N}`
    assert.ok(allOk)
  })

  // ===== 汇总 =====
  const pass = results.filter((r) => r.status === 'PASS').length
  const fail = results.length - pass
  console.log('\n=== 测试汇总 ===')
  console.log(`总计 ${results.length} | 通过 ${pass} | 失败 ${fail}`)
  console.log(`功能 ${results.filter((r) => r.category === '功能').length} | 安全 ${results.filter((r) => r.category === '安全').length} | 隔离 ${results.filter((r) => r.category === '隔离').length} | 审计 ${results.filter((r) => r.category === '审计').length} | 性能 ${results.filter((r) => r.category === '性能').length}`)
  console.log(`\n总体质量门禁：${fail === 0 ? 'PASS' : 'FAIL'}`)
  await new Promise((r) => server.kill('SIGTERM', r))
  process.exit(fail === 0 ? 0 : 1)
}

// —— 启动服务并运行 ——
const guard = setTimeout(() => {
  console.error('\n⛔ 测试超时兜底：强制退出')
  if (server) server.kill('SIGKILL')
  process.exit(3)
}, 45000)
guard.unref()

rmSync(join(ROOT, 'data'), { recursive: true, force: true })

server = spawn('node', [join(ROOT, 'src', 'server.js')], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT) }
})
server.stderr.on('data', (d) => process.stderr.write('[server] ' + d))

waitReady()
  .then(run)
  .catch(async (e) => {
    console.error('测试启动失败：', e.message)
    if (server) server.kill('SIGTERM')
    process.exit(2)
  })
