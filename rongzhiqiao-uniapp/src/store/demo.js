import { reactive, watch } from 'vue'

/**
 * 融智桥 DEMO 全局状态
 * - reactive 单例，跨页面 / 跨视图共享
 * - 深度监听，自动持久化到 uni.* 存储（微信小程序 / H5 / App 共用本地存储）
 * - 合规：全部为 DEMO 演示数据，无真实业务 / 无公链代币
 */
const STORAGE_KEY = 'rzq_demo_state_v1'

function defaults() {
  return {
    role: 'enterprise', // expert | ai | enterprise | platform
    view: 'home', // home | chat | dashboard | mine
    step: 0, // 制造业 DEMO 闯关步骤 0..4
    expiry: 14, // DEMO 失效天数（演示）
    profile: { name: '', phone: '', wechat: '', title: '', intro: '' },
    joined: false, // 是否已入驻生成名片
    points: 0, // 积分（入驻 +10 / 推荐 +2 去重）
    recommended: [], // 已推荐成员（去重）
    nda: false, // NDA 在线签署状态
    settled: false, // 联盟链+法币分账状态
    lic: '按年 LICENSE', // 收费/授权模式
    rules: { cap: false, seq: false, change: false, lead: false }, // 专家定义的排产规则
    scenario: {
      pain: '订单波动大、排产靠老师傅经验、交期经常延误',
      draft:
        '排产草案 A：设备#1 优先完成订单 D-2207（交期红线 7/15）；工序 #2→#5 顺排；换型并入夜班',
      risk: '高风险订单：D-2207（延误风险 3 天）、D-2210（物料缺料）',
      delayBefore: 6,
      delayAfter: 1
    },
    stats: {
      experts: 128,
      enterprises: 64,
      ai: 42,
      products: 37,
      demos: 21,
      day: 8.6,
      week: 51.2,
      month: 214.8,
      year: 1820.5
    },
    chat: [
      { r: 'enterprise', t: '老师傅经验排产总延误，想试 AI 方案（演示）' },
      { r: 'expert', t: '我先定规则：设备产能、工序顺序、交期红线' },
      { r: 'ai', t: '收到，已配排产预警 Agent，请企业代表审阅草案' },
      { r: 'enterprise', t: '延误从 6 天降到 1 天？点【批准】触发分账' },
      { r: 'platform', t: 'NDA 已签，全程数字水印保护（演示）' }
    ]
  }
}

function load() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw) return Object.assign(defaults(), raw)
  } catch (e) {
    /* 存储不可用时回落默认 */
  }
  return defaults()
}

export const S = reactive(load())

// 深度持久化（序列化 reactive 代理无碍）
watch(
  S,
  (val) => {
    try {
      uni.setStorageSync(STORAGE_KEY, JSON.parse(JSON.stringify(val)))
    } catch (e) {}
  },
  { deep: true }
)

// 重置 DEMO 闯关（保留入驻 / 积分等用户数据）
export function resetDemo() {
  S.step = 0
  S.settled = false
  S.rules = { cap: false, seq: false, change: false, lead: false }
}

// 清空全部本地状态（演示用）
export function clearAll() {
  try {
    uni.removeStorageSync(STORAGE_KEY)
  } catch (e) {}
  Object.assign(S, defaults())
}
