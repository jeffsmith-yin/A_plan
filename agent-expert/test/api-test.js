// 融智桥 · AI 智能体专家 MVP —— 零依赖 API 综合测试套件
// 覆盖：功能 / 安全（OWASP API Top 10 相关项）/ 性能（SLA 与并发）
// 运行：node test/api-test.js
import { spawn } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { strict as assert } from 'node:assert'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PORT = process.env.TEST_PORT || 8799
const BASE = `http://localhost:${PORT}`
const SLA_MS = 200 // 95th percentile 目标（参考平台 SLA 要求）

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
    const icon = t.status === 'PASS' ? '✅' : '❌'
    console.log(`${icon} [${category}] ${name} (${t.ms}ms)${t.detail ? ' — ' + t.detail : ''}`)
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

// ---------- 测试用例 ----------
async function run() {
  console.log('=== 融智桥 · AI 智能体专家 MVP API 测试 ===')
  console.log(`目标地址：${BASE}\n`)

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
    assert.strictEqual(typeof r.json.escalate, 'boolean')
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

  await rec('POST /analyze 缺少 text 字段 → 不崩溃', '功能', 'P1', async (t) => {
    const r = await req('POST', '/analyze', {})
    t.expected = '200（text 缺省为空，安全降级）'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 200)
  })

  await rec('POST /cart/add 有效技能包 → ok=true', '功能', 'P0', async (t) => {
    await req('POST', '/cart/clear')
    const r = await req('POST', '/cart/add', { id: 'SK-001' })
    t.expected = '200 ok=true'
    t.actual = `status=${r.status} ok=${r.json?.ok}`
    assert.strictEqual(r.status, 200)
    assert.strictEqual(r.json.ok, true)
  })

  await rec('POST /cart/add 无效技能包 ID → ok=false（不报错）', '功能', 'P1', async (t) => {
    const r = await req('POST', '/cart/add', { id: 'SK-999' })
    t.expected = '200 ok=false'
    t.actual = `status=${r.status} ok=${r.json?.ok}`
    assert.strictEqual(r.status, 200)
    assert.strictEqual(r.json.ok, false)
  })

  await rec('POST /cart/add 重复加购 → 去重 ok=false', '功能', 'P1', async (t) => {
    await req('POST', '/cart/clear')
    await req('POST', '/cart/add', { id: 'SK-002' })
    const r = await req('POST', '/cart/add', { id: 'SK-002' })
    t.expected = '200 ok=false（已存在）'
    t.actual = `status=${r.status} ok=${r.json?.ok}`
    assert.strictEqual(r.status, 200)
    assert.strictEqual(r.json.ok, false)
  })

  await rec('POST /cart/checkout 多包结算 → 按创建人分成正确', '功能', 'P0', async (t) => {
    await req('POST', '/cart/clear')
    await req('POST', '/cart/add', { id: 'SK-001' }) // person
    await req('POST', '/cart/add', { id: 'SK-007' }) // agent
    const r = await req('POST', '/cart/checkout')
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
    const sum = r.json.lines.reduce((a, l) => a + l.price, 0)
    assert.strictEqual(r.json.total, sum)
    assert.strictEqual(r.json.protocol, '透明智能分账协议')
    // 验证智能体创建人归属正确
    const agentLine = r.json.lines.find((l) => l.skillId === 'SK-007')
    assert.strictEqual(agentLine.creator.type, 'agent')
    assert.strictEqual(agentLine.creator.name, '融智桥·制造智能体')
  })

  await rec('POST /cart/checkout 空购物车 → total=0', '功能', 'P1', async (t) => {
    await req('POST', '/cart/clear')
    const r = await req('POST', '/cart/checkout')
    t.expected = '200 total=0 lines=[]'
    t.actual = `status=${r.status} total=${r.json?.total}`
    assert.strictEqual(r.status, 200)
    assert.strictEqual(r.json.total, 0)
    assert.strictEqual(r.json.lines.length, 0)
  })

  await rec('POST /cart/clear 清空 → ok=true', '功能', 'P1', async (t) => {
    const r = await req('POST', '/cart/clear')
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
  await rec('SQL 注入载荷 → 不崩溃、安全响应', '安全', 'P0', async (t) => {
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

  await rec('无鉴权访问受控端点 → 仍 200（MVP 缺口，标记）', '安全', 'P0', async (t) => {
    const r = await req('POST', '/analyze', { text: '缺料停线' })
    t.expected = '现状 200（MVP 无鉴权）；生产必须鉴权'
    t.actual = `status=${r.status}`
    assert.strictEqual(r.status, 200)
    t.detail = '⚠️ MVP 阶段未启用鉴权/限流：正式交付前须加 Bearer Token + 速率限制（见报告风险项）'
  })

  await rec('速率限制 → 现状无 429（标记缺口）', '安全', 'P1', async (t) => {
    const N = 120
    const calls = Array.from({ length: N }, () => req('GET', '/'))
    const res = await Promise.all(calls)
    const rateLimited = res.some((r) => r.status === 429)
    t.expected = '生产应有 429；现状无'
    t.actual = `请求数=${N} 被限流=${rateLimited}`
    assert.strictEqual(rateLimited, false)
    t.detail = '⚠️ 无速率限制：批量请求全部放行，正式环境需网关层限流防滥用'
  })

  // ===== C. 性能测试 =====
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

  await rec('POST /cart/checkout 并发结算 → 全成功', '性能', 'P1', async (t) => {
    await req('POST', '/cart/clear')
    await req('POST', '/cart/add', { id: 'SK-001' })
    await req('POST', '/cart/add', { id: 'SK-007' })
    const N = 30
    const calls = Array.from({ length: N }, () => req('POST', '/cart/checkout'))
    const res = await Promise.all(calls)
    const allOk = res.every((r) => r.status === 200 && r.json.lines.length === 2)
    t.expected = `${N} 并发全部返回 2 行结算`
    t.actual = `成功=${res.filter((r) => r.status === 200).length}/${N}`
    assert.ok(allOk)
  })

  // ---------- 汇总 ----------
  const pass = results.filter((r) => r.status === 'PASS').length
  const fail = results.length - pass
  const sec = results.filter((r) => r.category === '安全')
  const secPass = sec.filter((r) => r.status === 'PASS').length
  console.log('\n=== 测试汇总 ===')
  console.log(`总计 ${results.length} | 通过 ${pass} | 失败 ${fail}`)
  console.log(`功能 ${results.filter((r) => r.category === '功能').length} | 安全 ${sec.length}（通过 ${secPass}） | 性能 ${results.filter((r) => r.category === '性能').length}`)
  console.log(`单次 /analyze 响应：${singleMs}ms（SLA ${SLA_MS}ms）`)

  const quality = fail === 0 ? 'PASS' : 'FAIL'
  console.log(`\n总体质量门禁：${quality}`)

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

server = spawn('node', [join(ROOT, 'src', 'server.js')], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT) }
})
server.stderr.on('data', (d) => process.stderr.write('[server] ' + d))
server.on('exit', (code) => { if (code && code !== 0 && code !== 143) console.error('server exited', code) })

waitReady()
  .then(run)
  .catch(async (e) => {
    console.error('测试启动失败：', e.message)
    if (server) server.kill('SIGTERM')
    process.exit(2)
  })
