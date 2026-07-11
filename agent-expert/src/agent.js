// AI 智能体专家：接知识库 RAG + 制造业 Skills，做自动痛点分析（演示）
import { loadKB, retrieve } from './rag.js'

const ESCALATE_THRESHOLD = 0.25 // 置信度低于该值 → 升级人工

// 根因推断（基于命中关键词的启发式，仅演示）
function buildRootCause(text, ranked) {
  const causes = []
  if (text.includes('排产') || text.includes('老师傅') || text.includes('经验'))
    causes.push('排产高度依赖个人经验，缺乏结构化规则与系统支撑')
  if (text.includes('交期') || text.includes('延误') || text.includes('超期'))
    causes.push('缺乏交期风险预警，延误往往在临近交付才暴露')
  if (text.includes('换型') || text.includes('损耗'))
    causes.push('换型安排不合理，白班产能损耗偏高')
  if (text.includes('缺料') || text.includes('物料'))
    causes.push('物料齐套与排产未拉通，缺料导致停线/插单')
  if (text.includes('波动') || text.includes('订单波动') || text.includes('急单'))
    causes.push('订单波动缺乏安全库存与柔性排产缓冲')
  if (causes.length === 0)
    causes.push('痛点信息不足，需补充行业/工艺/订单结构等细节')
  return causes
}

function buildReply({ ranked, confidence, escalate, suggestedRules, warnings, rootCause }) {
  const skillNames = ranked.map((r) => `${r.skill.name}(${r.skill.id})`).join('、')
  const lines = []
  lines.push(`【AI 智能体专家 · 自动痛点分析】`)
  lines.push(`我已匹配到制造业技能包：${skillNames}（置信度 ${confidence}）。`)
  lines.push(`初步根因：${rootCause.join('；')}。`)
  if (suggestedRules.length) {
    lines.push(`建议规则（来自专家方法论）：`)
    suggestedRules.forEach((r) => lines.push(`  · ${r}`))
  }
  if (warnings.length) lines.push(`风险预警指标：${warnings.join('、')}。`)
  if (escalate) {
    lines.push(`⚠️ 当前置信度偏低，已建议转人工行业专家进一步诊断（不冒充真实自然人）。`)
  } else {
    lines.push(`下一步建议：进入 DEMO 闯关（专家定规则 → AI 配 Agent → 企业游戏化验收），里程碑达成触发 2-of-3 多签法币分账。`)
  }
  return lines.join('\n')
}

export function analyze(text, { topK = 3 } = {}) {
  const kb = loadKB()
  const { hits, ranked } = retrieve(text, kb, topK)

  if (ranked.length === 0) {
    return {
      role: 'AI 智能体专家',
      identityLabel: 'AI 助手（非真实自然人专家）',
      painPoint: text,
      painCategory: '未识别',
      matchedSkills: [],
      rootCause: buildRootCause(text, []),
      suggestedRules: [],
      warnings: [],
      confidence: 0,
      escalate: true,
      nextSteps: ['转人工行业专家', '补充行业/工艺/订单结构信息'],
      reply:
        `【AI 智能体专家】未能从知识库匹配到相关制造业技能包（演示数据有限）。已建议转人工行业专家进一步诊断。`
    }
  }

  const top = ranked[0]
  const confidence = Math.min(1, top.score / 3)
  const confidenceR = Number(confidence.toFixed(2))
  const escalate = confidence < ESCALATE_THRESHOLD

  const matchedSkills = ranked.map((r) => ({ id: r.skill.id, name: r.skill.name, score: r.score }))

  const suggestedRules = []
  const warnings = []
  ranked.forEach((r) => {
    Object.values(r.skill.ruleTemplate || {}).forEach((rule) => suggestedRules.push(rule))
    ;(r.skill.warningMetrics || []).forEach((w) => {
      if (text.includes(w) || hits.includes(w)) warnings.push(w)
    })
  })

  const dedupRules = [...new Set(suggestedRules)]
  const dedupWarnings = [...new Set(warnings)]
  const rootCause = buildRootCause(text, ranked)
  const reply = buildReply({
    ranked,
    confidence: confidenceR,
    escalate,
    suggestedRules: dedupRules,
    warnings: dedupWarnings,
    rootCause
  })

  return {
    role: 'AI 智能体专家',
    identityLabel: 'AI 助手（非真实自然人专家）',
    painPoint: text,
    painCategory: top.skill.domain,
    matchedSkills,
    rootCause,
    suggestedRules: dedupRules,
    warnings: dedupWarnings,
    confidence: confidenceR,
    escalate,
    nextSteps: escalate
      ? ['转人工行业专家', '补充业务数据']
      : ['进入 DEMO 闯关：专家定规则→AI配Agent→企业验收', '里程碑达成触发 2-of-3 多签法币分账'],
    reply
  }
}
