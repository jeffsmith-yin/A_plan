// 注入适配层（占位）：平台协助客户注入真实数据 → 技能包由 演示态 翻为 激活态
// 生产在此对接：客户系统/上传 → 平台校验 schema 与权限(DPA) → ETL/脱敏/加密落库 → 绑定技能运行时
import { loadKB } from './rag.js'
import { isPurchased, setActivated } from './activation.js'
import { recordInjection } from './audit.js'

export function injectRealData(sub, skillId, dataSource = null) {
  const kb = loadKB()
  const skill = kb.skills.find((s) => s.id === skillId)
  if (!skill) return { ok: false, code: 'NOT_FOUND', message: '技能包不存在' }
  if (!isPurchased(sub, skillId))
    return { ok: false, code: 'NOT_PURCHASED', message: '须先购买（结算）后方可由平台协助注入真实数据' }

  // —— 占位：真实数据接入（生产实现要点）——
  // 1) 校验 dataSource 结构与权限（DPA、最小必要、目的限定）
  // 2) 拉取/接收客户真实数据（ERP 导出 / 系统 API / 文件上传）
  // 3) ETL + 脱敏 + 加密落库（不出企业域、不进公开链）
  // 4) 绑定技能包运行时，置为 activated；外泄文件/截屏本身不可用
  const ds =
    dataSource || { type: 'platform_assisted', ref: 'demo-customer-data', note: '平台协助注入（占位）' }
  const binding = setActivated(sub, skillId, ds)
  const audit = recordInjection(sub, skillId, ds) // 审计 + 哈希链存证（接已交付 9 §七.3）
  return {
    ok: true,
    skillId,
    state: 'activated',
    bindingId: binding.bindingId,
    injectedAt: binding.injectedAt,
    dataSource: ds,
    auditRef: audit.txHash
  }
}
