// CLI 演示：AI 智能体专家自动痛点分析（接知识库 RAG + 制造业 Skills）
import { analyze } from './agent.js'

const SAMPLES = [
  '订单波动大、排产靠老师傅经验、交期经常延误',
  '设备经常超负荷，换型太频繁导致白班产能损耗高',
  '物料总在开工前才发现缺料，影响齐套',
  '我们做精密件，良率忽高忽低，批量质量风险大',
  '最近想做直播带货，但完全不懂怎么用 AI 获客'
]

function printResult(r) {
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

console.log('=== 融智桥 · AI 智能体专家 MVP 原型（演示）===')
console.log('知识库：制造业 Skills（词法 RAG）　注：全部为演示数据，AI 身份已标识')

if (process.argv.includes('--web')) {
  // 交给 server.js 处理
  await import('./server.js')
} else {
  for (const s of SAMPLES) printResult(analyze(s))
  console.log('\n' + '─'.repeat(60))
  console.log('提示：运行 `npm run web` 启动 Web 演示（企业代表输入痛点，智能体自动分析）。')
}
