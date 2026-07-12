// 限流：固定窗口（复用 agent-expert 模式，零依赖）
// 默认 600 次/60s，按 clientId（token.sub 或 IP）隔离

export const RATE_LIMIT = { max: 600, windowMs: 60_000 }
const buckets = new Map() // clientId → { count, reset }

function now() {
  return Date.now()
}

export function rateLimit(clientId) {
  const b = buckets.get(clientId)
  if (!b || now() > b.reset) {
    buckets.set(clientId, { count: 1, reset: now() + RATE_LIMIT.windowMs })
    return true
  }
  if (b.count >= RATE_LIMIT.max) return false
  b.count++
  return true
}

export function rateLimitHeaders(clientId) {
  const b = buckets.get(clientId)
  const remaining = b ? Math.max(0, RATE_LIMIT.max - b.count) : RATE_LIMIT.max
  const reset = b ? Math.ceil((b.reset - now()) / 1000) : RATE_LIMIT.windowMs / 1000
  return {
    'X-RateLimit-Limit': String(RATE_LIMIT.max),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(reset)
  }
}
