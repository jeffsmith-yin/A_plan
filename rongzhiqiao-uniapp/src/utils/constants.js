// 角色 / Tab / 步骤 等常量（与 H5 原型保持一致）
export const ROLES = {
  expert: { name: '35+ 行业专家', ic: '🧓', cls: 'who-expert' },
  ai: { name: 'AI 技术人才', ic: '🤖', cls: 'who-ai' },
  enterprise: { name: '中小微企业代表', ic: '🏭', cls: 'who-ent' },
  platform: { name: '平台运营方', ic: '🛡️', cls: 'who-plat' }
}

export const ROLE_ORDER = ['expert', 'ai', 'enterprise', 'platform']

export const TABS = [
  { key: 'home', ic: '🎮', label: '闯关' },
  { key: 'chat', ic: '💬', label: '交流' },
  { key: 'dashboard', ic: '📊', label: '看板' },
  { key: 'mine', ic: '👤', label: '我的' }
]

export const STEP_TITLES = [
  '① 企业提出痛点',
  '② 专家诊断（定规则）',
  '③ AI 人才实现（配 Agent）',
  '④ 企业验收（游戏化审阅）',
  '⑤ 联盟链 + 法币 自动分账'
]

// 收费 / 授权模式（最终产品三选一）
export const LIC_MODES = ['按年 LICENSE', '永久授权', '到日期失效']
