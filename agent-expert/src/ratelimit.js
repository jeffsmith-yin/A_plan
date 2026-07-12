// 限流（零依赖）：固定窗口计数，按 clientId（token.sub 或 IP）隔离
// 生产须替换为网关/Redis 分布式限流；此为单实例演示
const RATE_MAX = Number(process.env.RATE_MAX || 600)
const RATE_WINDOW_MS = Number(process.env.RATE_WINDOW_MS || 60000)
const buckets = new Map() // clientId -> { count, resetAt }

export function rateLimit(clientId) {
  const now = Date.now()
  let b = buckets.get(clientId)
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + RATE_WINDOW_MS }
    buckets.set(clientId, b)
  }
  b.count++
  return b.count <= RATE_MAX
}

export function rateLimitHeaders(clientId) {
  const b = buckets.get(clientId)
  const consumed = b ? b.count : 0
  const remaining = Math.max(0, RATE_MAX - consumed)
  const reset = b ? Math.ceil((b.resetAt - Date.now()) / 1000) : Math.ceil(RATE_WINDOW_MS / 1000)
  return {
    'X-RateLimit-Limit': String(RATE_MAX),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(reset)
  }
}

export const RATE_LIMIT = RATE_MAX
