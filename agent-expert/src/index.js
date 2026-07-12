// CLI 演示：AI 智能体专家自动痛点分析（接知识库 RAG + 制造业 Skills）
// + 技能包可复用 / 加入购物车 / 按创建人（自然人或智能体）拟定分成结算
import { analyze } from './agent.js'
import { loadKB } from './rag.js'
import { addToCart, listCart, checkout, clearCart } from './cart.js'
import { recordPurchase, getState, listActivations, STATE_LABEL } from './activation.js'
import { injectRealData } from './injection.js'

const SAMPLES = [
  '订单波动大、排产靠老师傅经验、交期经常延误',
  '设备经常超负荷，换型太频繁导致白班产能损耗高',
  '物料总在开工前才发现缺料，影响齐套',
  '我们做精密件，良率忽高忽低，批量质量风险大',
  '最近想做直播带货，但完全不懂怎么用 AI 获客'
]

function printAnalysis(r) {
  console.log('\n' + '─'.repeat(60))
  console.log(`痛点：${r.painPoint}`)
  console.log(`身份：${r.role} · ${r.identityLabel}`)
  console.log(`分类：${r.painCategory}　置信度：${r.confidence}　${r.escalate ? '⚠️ 建议转人工' : '✅ 智能体可处理'}`)
  console.log(`匹配技能：${r.matchedSkills.map((s) => `${s.name}(${s.id},分${s.score})`).join('、') || '无'}`)
  console.log(`根因：${r.rootCause.join('；')}`)
  if (r.suggestedRules.length) console.log(`建议规则：\n  · ` + r.suggestedRules.join('\n  · '))
  if (r.warnings.length) console.log(`预警指标：${r.warnings.join('、')}`)
  console.log('回复：')
  console.log(r.reply)
}

// 真实数据注入激活 · 生命周期演示（演示态 → 激活态）
function runLifecycle() {
  const sub = 'cli-demo-sub'
  const DEMO_DS = {
    type: 'platform_assisted',
    ref: 'acme-erp_demo',
    note: '客户 ACME 制造 · 平台协助注入（演示）'
  }
  console.log('\n' + '═'.repeat(60))
  console.log('真实数据注入激活 · 生命周期演示（演示态 → 激活态）')
  console.log('═'.repeat(60))

  // 1) 分析痛点 → 匹配技能包
  const r = analyze(SAMPLES[0])
  const skill = r.matchedSkills[0]
  console.log(`\n[1] 痛点分析匹配技能包：${skill.name} (${skill.id})`)
  console.log(`    初始状态：${getState(sub, skill.id)} (${STATE_LABEL[getState(sub, skill.id)]})`)

  // 2) 企业购买（结算）→ 演示态 demo
  recordPurchase(sub, [skill.id])
  console.log(`[2] 企业购买（结算）→ 状态：${getState(sub, skill.id)} (${STATE_LABEL[getState(sub, skill.id)]})`)

  // 3) 平台协助注入真实数据 → 激活态 activated
  const inj = injectRealData(sub, skill.id, DEMO_DS)
  console.log(`[3] 平台协助注入真实数据 → 状态：${getState(sub, skill.id)} (${STATE_LABEL[getState(sub, skill.id)]})`)
  console.log(`    绑定ID(bindingId)：${inj.bindingId}`)
  console.log(`    审计引用(auditRef)：${inj.auditRef}`)
  console.log(`    注入适配层：${inj.adapter}（生产可替换为真实 ERP/DB 适配器）`)

  // 4) 等价视图：我的技能包（接 /my-skills）
  const mine = listActivations(sub)
  console.log(`[4] 我的技能包视图（listActivations）：`)
  mine.forEach((m) => console.log(`    · ${m.skillId} → ${m.state} (${STATE_LABEL[m.state]})`))

  console.log('\n提示：运行 `npm run web` 启动 Web 演示；注入适配层接口见 src/injection.js（可替换 DemoInjectionAdapter）。')
}

console.log('=== 融智桥 · AI 智能体专家 MVP 原型（演示）===')
console.log('知识库：制造业 Skills（词法 RAG）　注：全部为演示数据，AI 身份已标识')

if (process.argv.includes('--lifecycle')) {
  runLifecycle()
} else if (process.argv.includes('--web')) {
  await import('./server.js')
} else {
  for (const s of SAMPLES) printAnalysis(analyze(s))

  // 购物车 + 按创建人分成结算（演示「技能包可复用 + 加入购物车 + 正式交付分成」）
  console.log('\n' + '═'.repeat(60))
  console.log('购物车 + 按创建人（自然人/智能体）分成结算（演示）')
  console.log('═'.repeat(60))
  const kb = loadKB()
  clearCart()
  const top = analyze(SAMPLES[0]).matchedSkills.slice(0, 3) // 取前 3 个推荐技能包
  top.forEach((s) => {
    if (addToCart(s.id)) console.log(`+ 加入购物车：${s.name} (${s.id})`)
  })

  const settle = checkout(kb)
  console.log(`\n协议：${settle.protocol}｜${settle.settlement}`)
  console.log(`订单总额：¥${settle.total}`)
  settle.lines.forEach((l) => {
    console.log(
      `  · ${l.name}(${l.skillId}) 创建人[${l.creator.type}:${l.creator.name}] ¥${l.price} → 创建人 ¥${l.creatorPayout} / 平台 ¥${l.platformPayout} / 链上 ¥${l.chainPayout}`
    )
  })
  console.log(
    `合计：创建人 ¥${settle.totals.creatorTotal} / 平台 ¥${settle.totals.platformTotal} / 链上 ¥${settle.totals.chainTotal}`
  )
  console.log(settle.note)
  console.log('\n提示：运行 `npm run web` 启动 Web 演示（企业代表输入痛点，智能体自动分析）。')
}
