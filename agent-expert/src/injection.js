// 真实数据注入激活机制：注入适配层（可替换接缝）
// 技能包购买（结算）后处于 'demo' 态；平台协助客户注入真实数据 → 翻为 'activated' 态
// 生产在此对接：客户系统/上传 → 平台校验 schema 与权限(DPA) → ETL/脱敏/加密落库 → 绑定技能运行时
//
// 适配层接口（稳定契约 InjectionAdapter）：任何实现满足以下方法即可替换默认 DemoInjectionAdapter，
// 调用方 injectRealData 的签名与返回结构保持不变（接已交付 9 §七、已交付 11）。

import { loadKB } from './rag.js'
import { isPurchased, setActivated } from './activation.js'
import { recordInjection } from './audit.js'

// —— 注入适配层接口（契约）——
// 生产环境替换为真实 ERP/DB 适配器（继承并覆盖以下方法）即可，injectRealData 调用方式不变。
export class InjectionAdapter {
  // [PRODUCTION] 校验数据委托处理协议(DPA)、最小必要、目的限定
  validateDPA(/* sub, skillId, dataSource */) {
    throw new Error('validateDPA not implemented')
  }
  // [PRODUCTION] 拉取/接收客户真实数据（ERP 导出 / 系统 API / 文件上传）
  fetchSource(/* dataSource */) {
    throw new Error('fetchSource not implemented')
  }
  // [PRODUCTION] ETL：脱敏 / 清洗 / 结构化（不出企业域、不进公开链）
  etl(/* raw */) {
    throw new Error('etl not implemented')
  }
  // [PRODUCTION] 加密落库 + 绑定技能运行时，返回 { bound, bindingRef }
  encryptBind(/* clean */) {
    throw new Error('encryptBind not implemented')
  }
}

// —— 默认演示适配层（安全占位，不触外网）——
export class DemoInjectionAdapter extends InjectionAdapter {
  validateDPA(sub, skillId, dataSource) {
    // 演示：仅校验结构；生产在此校验 DPA 签署、最小必要、目的限定
    if (dataSource && typeof dataSource !== 'object') {
      return { ok: false, reason: 'dataSource 结构非法' }
    }
    return { ok: true }
  }
  fetchSource(dataSource) {
    // 演示：不拉取真实数据；生产在此对接 ERP/系统 API/文件，返回原始数据
    return dataSource || { type: 'platform_assisted', ref: 'demo-customer-data' }
  }
  etl(raw) {
    // 演示：原样结构化；生产在此脱敏/清洗/字段映射
    return { ...raw, _etl: 'demo', cleanedAt: new Date().toISOString() }
  }
  encryptBind(clean) {
    // 演示：生成绑定引用（非真实加密）；生产在此加密落库并返回可验证 bindingRef
    const bindingRef = 'bind_' + Math.random().toString(36).slice(2, 12)
    return { bound: true, bindingRef, clean }
  }
}

// 默认注入适配层；生产可替换为真实适配器：setInjectionAdapter(new ErpInjectionAdapter())
let adapter = new DemoInjectionAdapter()
export function setInjectionAdapter(custom) {
  if (!(custom instanceof InjectionAdapter)) throw new Error('适配器须继承 InjectionAdapter')
  adapter = custom
}

// 注入真实数据：购买态 → 激活态（经适配层契约执行）
export function injectRealData(sub, skillId, dataSource = null) {
  const kb = loadKB()
  const skill = kb.skills.find((s) => s.id === skillId)
  if (!skill) return { ok: false, code: 'NOT_FOUND', message: '技能包不存在' }
  if (!isPurchased(sub, skillId))
    return { ok: false, code: 'NOT_PURCHASED', message: '须先购买（结算）后方可由平台协助注入真实数据' }

  // —— 经适配层契约执行真实数据接入（生产实现要点）——
  const dpa = adapter.validateDPA(sub, skillId, dataSource)
  if (!dpa.ok) return { ok: false, code: 'DPA_REJECTED', message: dpa.reason || '数据接入未通过 DPA 校验' }
  const raw = adapter.fetchSource(dataSource)
  const clean = adapter.etl(raw)
  const { bound, bindingRef } = adapter.encryptBind(clean)

  const ds = {
    ...(dataSource || { type: 'platform_assisted', ref: 'demo-customer-data', note: '平台协助注入（占位）' }),
    bindingRef
  }
  const binding = setActivated(sub, skillId, ds)
  const audit = recordInjection(sub, skillId, ds) // 审计 + 哈希链存证（接已交付 9 §七.3）
  return {
    ok: true,
    skillId,
    state: 'activated',
    bindingId: binding.bindingId,
    injectedAt: binding.injectedAt,
    dataSource: ds,
    auditRef: audit.txHash,
    adapter: adapter.constructor.name
  }
}
