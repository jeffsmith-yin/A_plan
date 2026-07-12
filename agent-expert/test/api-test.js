// 融智桥 · AI 智能体专家 MVP —— 零依赖 API 综合测试套件（含 P0 安全项）
// 覆盖：功能 / 安全（鉴权·限流·注入·XSS·体限）/ 性能（SLA 与并发）/ 购物车隔离 / 结算审计
// 运行：node test/api-test.js   （自动拉起服务、跑完自清，退出码 0=通过 / 1=失败 / 3=超时兜底）
import { spawn } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { strict as assert } from 'node:assert'
import { signToken } from '../src/auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PORT = process.env.TEST_PORT || 8799
const BASE = `http://localhost:${PORT}`
const SLA_MS = 200

// ---------- 轻量测试框架 ----------
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
      const r = await fetch(BASE + '/')
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
async function login(apiKey) {
  const r = await req('POST', '/auth/login', { apiKey })
  assert.strictEqual(r.status, 200, '登录应成功')
  return r.json.token
}

// ---------- 测试用例 ----------
async function run() {
  console.log('=== 融智桥 · AI 智能体专家 MVP API 测试（P0 安全项已启用）===')
  console.log(`目标地址：${BASE}\n`)

  // 登录拿令牌
  const memberToken = await login('member-demo-key')
  const member2Token = await login('member-demo-key-2')
  const platformToken = await login('platform-demo-key')

  // ===== A. 功能测试 =====
  await rec('GET / 健康检查返回演示页', '功能', 'P1', async (t) => {
    const r = await req('GET', '/')
    t.expected = '200 且含品牌标识'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 200)
    assert.ok(r.text.includes('融智桥'), '页面应含品牌标识')
    assert.ok(r.text.includes('演示'), '应显著标注演示')
  })

  await rec('POST /analyze 正常痛点文本 → 结构化分析', '功能', 'P0', async (t) => {
    const r = await req('POST', '/analyze', { text: '订单波动大、排产靠老师傅经验、交期经常延误' })
    t.expected = '200 且含 painCategory/confidence/matchedSkills/escalate'
    t.actual = `status=${r.status} category=${r.json?.painCategory} conf=${r.json?.confidence}`
    assert.strictEqual(r.status, 200)
    assert.ok(typeof r.json.painCategory === 'string')
    assert.ok(typeof r.json.confidence === 'number')
    assert.ok(Array.isArray(r.json.matchedSkills))
    assert.strictEqual(r.json.role, 'AI 智能体专家', '身份标识应为 AI 智能体专家')
    assert.ok(r.json.identityLabel.includes('非真实自然人'), '必须显著声明非冒充真人')
    assert.ok(r.json.matchedSkills.length > 0, '应匹配到技能包')
  })

  await rec('POST /analyze 空文本 → 安全降级为转人工', '功能', 'P1', async (t) => {
    const r = await req('POST', '/analyze', { text: '' })
    t.expected = '200 且 escalate=true, confidence=0'
    t.actual = `status=${r.status} escalate=${r.json?.escalate} conf=${r.json?.confidence}`
    assert.strictEqual(r.status, 200)
    assert.strictEqual(r.json.escalate, true)
    assert.strictEqual(r.json.confidence, 0)
    assert.ok(Array.isArray(r.json.matchedSkills) && r.json.matchedSkills.length === 0)
  })

  await rec('GET /cart 查看我的购物车（按用户隔离）', '功能', 'P1', async (t) => {
    const r = await req('GET', '/cart', undefined, authH(memberToken))
    t.expected = '200 且 items 为数组'
    t.actual = `status=${r.status} sub=${r.json?.sub}`
    assert.strictEqual(r.status, 200)
    assert.strictEqual(r.json.sub, 'member-001')
    assert.ok(Array.isArray(r.json.items))
  })

  await rec('POST /cart/add 有效技能包 → ok=true', '功能', 'P0', async (t) => {
    await req('POST', '/cart/clear', undefined, authH(memberToken))
    const r = await req('POST', '/cart/add', { id: 'SK-001' }, authH(memberToken))
    t.expected = '200 ok=true'
    t.actual = `status=${r.status} ok=${r.json?.ok}`
    assert.strictEqual(r.status, 200)
    assert.strictEqual(r.json.ok, true)
  })

  await rec('POST /cart/add 无效技能包 ID → ok=false（不报错）', '功能', 'P1', async (t) => {
    const r = await req('POST', '/cart/add', { id: 'SK-999' }, authH(memberToken))
    t.expected = '200 ok=false'
    t.actual = `status=${r.status} ok=${r.json?.ok}`
    assert.strictEqual(r.status, 200)
    assert.strictEqual(r.json.ok, false)
  })

  await rec('POST /cart/add 重复加购 → 去重 ok=false', '功能', 'P1', async (t) => {
    await req('POST', '/cart/clear', undefined, authH(memberToken))
    await req('POST', '/cart/add', { id: 'SK-002' }, authH(memberToken))
    const r = await req('POST', '/cart/add', { id: 'SK-002' }, authH(memberToken))
    t.expected = '200 ok=false（已存在）'
    t.actual = `status=${r.status} ok=${r.json?.ok}`
    assert.strictEqual(r.status, 200)
    assert.strictEqual(r.json.ok, false)
  })

  await rec('POST /cart/checkout 多包结算 → 按创建人分成正确', '功能', 'P0', async (t) => {
    await req('POST', '/cart/clear', undefined, authH(memberToken))
    await req('POST', '/cart/add', { id: 'SK-001' }, authH(memberToken))
    await req('POST', '/cart/add', { id: 'SK-007' }, authH(memberToken))
    const r = await req('POST', '/cart/checkout', undefined, authH(memberToken))
    t.expected = '200 两行；创建人80%/平台18%/链上2%；合计守恒'
    t.actual = `status=${r.status} lines=${r.json?.lines?.length} total=${r.json?.total}`
    assert.strictEqual(r.status, 200)
    assert.strictEqual(r.json.lines.length, 2)
    for (const l of r.json.lines) {
      assert.ok(Math.abs(l.creatorPayout + l.platformPayout + l.chainPayout - l.price) < 0.01, '分成之和应等于单价（容差 0.01）')
      assert.ok(Math.abs(l.creatorPayout - l.price * 0.8) < 0.01, '创建人应≈80%')
      assert.ok(Math.abs(l.platformPayout - l.price * 0.18) < 0.01, '平台应≈18%')
      assert.ok(Math.abs(l.chainPayout - l.price * 0.02) < 0.01, '链上应≈2%')
    }
    assert.strictEqual(r.json.total, r.json.lines.reduce((a, l) => a + l.price, 0))
    assert.strictEqual(r.json.protocol, '透明智能分账协议')
    const agentLine = r.json.lines.find((l) => l.skillId === 'SK-007')
    assert.strictEqual(agentLine.creator.type, 'agent')
    assert.strictEqual(agentLine.creator.name, '融智桥·制造智能体')
    assert.ok(typeof r.json.auditRef === 'string' && r.json.auditRef.length > 0, '应返回审计交易哈希')
  })

  await rec('POST /cart/checkout 空购物车 → total=0', '功能', 'P1', async (t) => {
    await req('POST', '/cart/clear', undefined, authH(memberToken))
    const r = await req('POST', '/cart/checkout', undefined, authH(memberToken))
    t.expected = '200 total=0 lines=[]'
    t.actual = `status=${r.status} total=${r.json?.total}`
    assert.strictEqual(r.status, 200)
    assert.strictEqual(r.json.total, 0)
    assert.strictEqual(r.json.lines.length, 0)
  })

  await rec('POST /cart/clear 清空 → ok=true', '功能', 'P1', async (t) => {
    const r = await req('POST', '/cart/clear', undefined, authH(memberToken))
    t.expected = '200 ok=true'
    t.actual = `status=${r.status} ok=${r.json?.ok}`
    assert.strictEqual(r.status, 200)
    assert.strictEqual(r.json.ok, true)
  })

  await rec('未知路由 → 404', '功能', 'P2', async (t) => {
    const r = await req('GET', '/nope')
    t.expected = '404'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 404)
  })

  // ===== B. 安全测试 =====
  await rec('鉴权：POST /cart/add 无 token → 401', '安全', 'P0', async (t) => {
    const r = await req('POST', '/cart/add', { id: 'SK-001' })
    t.expected = '401'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 401, '受控端点无令牌须拒绝')
  })

  await rec('鉴权：POST /cart/add 伪造/无效 token → 401', '安全', 'P0', async (t) => {
    const r = await req('POST', '/cart/add', { id: 'SK-001' }, authH('Bearer fake.token.here'))
    t.expected = '401'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 401)
  })

  await rec('鉴权：过期 token → 401', '安全', 'P0', async (t) => {
    const expired = signToken('member-001', 'member', -10) // exp 已过期
    const r = await req('POST', '/cart/add', { id: 'SK-001' }, authH(expired))
    t.expected = '401'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 401)
  })

  await rec('鉴权：有效 token → 200（鉴权通过）', '安全', 'P0', async (t) => {
    const r = await req('POST', '/cart/add', { id: 'SK-003' }, authH(memberToken))
    t.expected = '200 ok=true'
    t.actual = `status=${r.status} ok=${r.json?.ok}`
    assert.strictEqual(r.status, 200)
    assert.strictEqual(r.json.ok, true)
  })

  await rec('鉴权：GET /audit 非 platform 角色 → 403', '安全', 'P0', async (t) => {
    const r = await req('GET', '/audit', undefined, authH(memberToken))
    t.expected = '403'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 403)
  })

  await rec('SQL 注入载荷 → 不崩溃、安全响应', '安全', 'P1', async (t) => {
    const payload = "'; DROP TABLE skills; -- 1=1"
    const r = await req('POST', '/analyze', { text: payload })
    t.expected = '200/4xx，不返回 500 崩溃'
    t.actual = `status=${r.status}`
    assert.notStrictEqual(r.status, 500, '注入不应导致 500 崩溃')
  })

  await rec('XSS 载荷 → 不执行、仅作数据原样返回', '安全', 'P1', async (t) => {
    const payload = '<script>alert(1)</script> 交期延误'
    const r = await req('POST', '/analyze', { text: payload })
    t.expected = '200 且 text 仅作字符串处理'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 200)
    assert.ok(JSON.stringify(r.json).includes('<script>'), '载荷应作为普通文本被保留，而非被执行')
  })

  await rec('畸形 JSON → 优雅处理（映射为 400）', '安全', 'P1', async (t) => {
    const r = await req('POST', '/analyze', '{bad json', undefined)
    t.expected = '400'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 400, '解析错误应映射为 400 而非 500')
  })

  await rec('超大请求体 → 触发 413 体限（防 DoS）', '安全', 'P1', async (t) => {
    const big = '交期延误 ' + 'x'.repeat(1_200_000)
    const r = await req('POST', '/analyze', { text: big })
    t.expected = '413（已加 1MB 体限）'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 413, '超 1MB 负载应被 413 拒绝')
  })

  // ===== C. 购物车隔离 + 持久化 =====
  await rec('购物车隔离：用户 B 看不到用户 A 的购物车', '隔离', 'P0', async (t) => {
    await req('POST', '/cart/clear', undefined, authH(memberToken))
    await req('POST', '/cart/add', { id: 'SK-001' }, authH(memberToken))
    const a = await req('GET', '/cart', undefined, authH(memberToken))
    const b = await req('GET', '/cart', undefined, authH(member2Token))
    t.expected = 'A 有 SK-001；B 为空（不同 sub 隔离）'
    t.actual = `A=${a.json.items.length} B=${b.json.items.length}`
    assert.ok(a.json.items.some((x) => x.id === 'SK-001'))
    assert.strictEqual(b.json.items.length, 0, '用户 B 不应看到 A 的购物车')
    const bCheckout = await req('POST', '/cart/checkout', undefined, authH(member2Token))
    assert.strictEqual(bCheckout.json.total, 0, 'B 结算应为 0（隔离验证）')
  })

  await rec('购物车持久化：落盘文件含该用户条目', '隔离', 'P1', async (t) => {
    const fs = await import('node:fs')
    const p = join(ROOT, 'data', 'cart-store.json')
    t.expected = 'data/cart-store.json 含 member-001 的 SK-001'
    t.actual = `exists=${fs.existsSync(p)}`
    assert.ok(fs.existsSync(p), '购物车应持久化到磁盘')
    const store = JSON.parse(fs.readFileSync(p, 'utf8'))
    assert.ok(store['member-001'] && store['member-001'].items.includes('SK-001'), '持久化文件应含该用户条目')
  })

  // ===== D. 结算审计（哈希链存证）=====
  let auditCountBefore = 0
  await rec('结算审计：checkout 写入审计 + 哈希链存证', '审计', 'P0', async (t) => {
    await req('POST', '/cart/clear', undefined, authH(memberToken))
    await req('POST', '/cart/add', { id: 'SK-001' }, authH(memberToken))
    await req('POST', '/cart/add', { id: 'SK-007' }, authH(memberToken))
    const before = await req('GET', '/audit', undefined, authH(platformToken))
    auditCountBefore = before.json.entries.length
    const r = await req('POST', '/cart/checkout', undefined, authH(memberToken))
    t.expected = '平台可查审计；含 sub/金额/txHash；链完整'
    t.actual = `status=${r.status} auditRef=${r.json?.auditRef?.slice(0, 8)}`
    assert.strictEqual(r.status, 200)
    assert.ok(/^[0-9a-f]{64}$/.test(r.json.auditRef), '审计交易哈希应为 64 位十六进制')
    const after = await req('GET', '/audit', undefined, authH(platformToken))
    assert.strictEqual(after.json.entries.length, auditCountBefore + 1, '审计条目应 +1')
    const last = after.json.entries[after.json.entries.length - 1]
    assert.strictEqual(last.sub, 'member-001', '审计应记录操作人')
    assert.strictEqual(last.total, 398, '审计金额应=两包 ¥398')
    assert.strictEqual(after.json.ledger.ok, true, '哈希链应连续完整')
  })

  // ===== D2. 真实数据注入激活（演示态/激活态切换 + 注入适配层占位）=====
  await rec('注入适配层：未购买先注入真实数据 → 409', '激活', 'P0', async (t) => {
    const r = await req('POST', '/inject', { skillId: 'SK-005' }, authH(memberToken)) // SK-005 未购买
    t.expected = '409 NOT_PURCHASED'
    t.actual = `status=${r.status} code=${r.json?.code}`
    assert.strictEqual(r.status, 409)
    assert.strictEqual(r.json.code, 'NOT_PURCHASED')
  })

  await rec('真实数据注入：购买后注入 → 激活态', '激活', 'P0', async (t) => {
    const r = await req('POST', '/inject', { skillId: 'SK-001' }, authH(memberToken)) // SK-001 此前已购买（演示态）
    t.expected = '200 state=activated，含 auditRef'
    t.actual = `status=${r.status} state=${r.json?.state} ref=${r.json?.auditRef?.slice(0, 8)}`
    assert.strictEqual(r.status, 200)
    assert.strictEqual(r.json.state, 'activated')
    assert.ok(/^[0-9a-f]{64}$/.test(r.json.auditRef), '注入应返回审计交易哈希')
  })

  await rec('演示态/激活态切换：/my-skills 反映状态', '激活', 'P1', async (t) => {
    const r = await req('GET', '/my-skills', undefined, authH(memberToken))
    t.expected = 'SK-001=activated'
    t.actual = `status=${r.status} skills=${r.json.skills.length}`
    assert.strictEqual(r.status, 200)
    const sk1 = r.json.skills.find((s) => s.skillId === 'SK-001')
    assert.ok(sk1 && sk1.state === 'activated', 'SK-001 应已激活')
  })

  await rec('分析附激活态：注入后 matchedSkills.usable=true', '激活', 'P1', async (t) => {
    const r = await req('POST', '/analyze', { text: '排产靠老师傅经验、交期经常延误' }, authH(memberToken))
    t.expected = '匹配 SK-001 且其 usable=true（已激活）'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 200)
    const sk1 = r.json.matchedSkills.find((s) => s.id === 'SK-001')
    assert.ok(sk1, '应匹配 SK-001')
    assert.strictEqual(sk1.state, 'activated')
    assert.strictEqual(sk1.usable, true)
    assert.ok(r.json.activationNote, '应含激活态提示')
  })

  await rec('注入审计：平台可查注入记录（哈希链）', '激活', 'P0', async (t) => {
    const r = await req('GET', '/audit', undefined, authH(platformToken))
    t.expected = 'injections 含 SK-001 注入条目；链完整'
    t.actual = `status=${r.status} injections=${r.json.injections?.length} ledgerOk=${r.json.ledger?.ok}`
    assert.strictEqual(r.status, 200)
    assert.ok(Array.isArray(r.json.injections))
    assert.ok(r.json.injections.some((e) => e.skillId === 'SK-001' && e.type === 'injection'))
    assert.strictEqual(r.json.ledger.ok, true)
  })

  // ===== E. 性能测试 =====
  let singleMs = 0
  await rec(`POST /analyze 单次响应 < ${SLA_MS}ms（SLA）`, '性能', 'P0', async (t) => {
    const t0 = performance.now()
    const r = await req('POST', '/analyze', { text: '交期经常延误、缺料停线' })
    singleMs = performance.now() - t0
    t.expected = `<${SLA_MS}ms`
    t.actual = `${singleMs.toFixed(1)}ms`
    assert.strictEqual(r.status, 200)
    assert.ok(singleMs < SLA_MS, `超出 SLA：实际 ${singleMs.toFixed(1)}ms`)
  })

  await rec('POST /analyze 50 并发 → 全成功且均值 < 500ms', '性能', 'P0', async (t) => {
    const N = 50
    const calls = Array.from({ length: N }, () => req('POST', '/analyze', { text: '订单波动大、排产靠经验' }))
    const t0 = performance.now()
    const res = await Promise.all(calls)
    const wall = performance.now() - t0
    const allOk = res.every((r) => r.status === 200)
    const avg = wall / N
    t.expected = `全 200，均值<500ms`
    t.actual = `成功=${res.filter((r) => r.status === 200).length}/${N} 墙钟=${wall.toFixed(1)}ms 均值=${(wall / N).toFixed(1)}ms`
    assert.ok(allOk, '并发请求应全部成功')
    assert.ok(avg < 500, `并发均值超阈值：${avg.toFixed(1)}ms`)
  })

  await rec('POST /cart/checkout 并发结算（鉴权）→ 全成功', '性能', 'P1', async (t) => {
    await req('POST', '/cart/clear', undefined, authH(memberToken))
    await req('POST', '/cart/add', { id: 'SK-001' }, authH(memberToken))
    await req('POST', '/cart/add', { id: 'SK-007' }, authH(memberToken))
    const N = 30
    const calls = Array.from({ length: N }, () => req('POST', '/cart/checkout', undefined, authH(memberToken)))
    const res = await Promise.all(calls)
    const allOk = res.every((r) => r.status === 200 && r.json.lines.length === 2)
    t.expected = `${N} 并发全部返回 2 行结算`
    t.actual = `成功=${res.filter((r) => r.status === 200).length}/${N}`
    assert.ok(allOk)
  })

  // 限流（置为最后执行：用独立令牌 member-002 打满其专属桶，不影响前述 IP/其他令牌桶）
  await rec('限流：高频请求 → 触发 429（限流已生效）', '安全', 'P0', async (t) => {
    const N = 700
    const calls = Array.from({ length: N }, () => req('POST', '/cart/add', { id: 'SK-001' }, authH(member2Token), 10000))
    const res = await Promise.all(calls)
    const rateLimited = res.some((r) => r.status === 429)
    t.expected = '应出现 429（默认上限 600/60s，按令牌隔离）'
    t.actual = `请求数=${N} 被限流=${rateLimited}`
    assert.strictEqual(rateLimited, true, '超出限流阈值应返回 429')
  })

  // ---------- 汇总 ----------
  const pass = results.filter((r) => r.status === 'PASS').length
  const fail = results.length - pass
  const sec = results.filter((r) => r.category === '安全')
  const secPass = sec.filter((r) => r.status === 'PASS').length
  console.log('\n=== 测试汇总 ===')
  console.log(`总计 ${results.length} | 通过 ${pass} | 失败 ${fail}`)
  console.log(`功能 ${results.filter((r) => r.category === '功能').length} | 安全 ${sec.length}（通过 ${secPass}） | 隔离 ${results.filter((r) => r.category === '隔离').length} | 审计 ${results.filter((r) => r.category === '审计').length} | 激活 ${results.filter((r) => r.category === '激活').length} | 性能 ${results.filter((r) => r.category === '性能').length}`)
  console.log(`单次 /analyze 响应：${singleMs.toFixed(1)}ms（SLA ${SLA_MS}ms）`)
  console.log(`\n总体质量门禁：${fail === 0 ? 'PASS' : 'FAIL'}`)
  await new Promise((r) => server.kill('SIGTERM', r))
  process.exit(fail === 0 ? 0 : 1)
}

// ---------- 启动服务并运行 ----------
// 全局兜底：任何意外挂起都在 45s 后强制退出，避免 CI 卡死（同时会终止子服务）
const guard = setTimeout(() => {
  console.error('\n⛔ 测试超时兜底：强制退出')
  if (server) server.kill('SIGKILL')
  process.exit(3)
}, 45000)
guard.unref()

// 清空运行时数据，保证审计/购物车计数确定性
rmSync(join(ROOT, 'data'), { recursive: true, force: true })

server = spawn('node', [join(ROOT, 'src', 'server.js')], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT) }
})
server.stderr.on('data', (d) => process.stderr.write('[server] ' + d))
server.on('exit', (code) => {
  if (code && code !== 0 && code !== 143) console.error('server exited', code)
})

waitReady()
  .then(run)
  .catch(async (e) => {
    console.error('测试启动失败：', e.message)
    if (server) server.kill('SIGTERM')
    process.exit(2)
  })
