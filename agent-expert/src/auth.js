// 轻量鉴权（零依赖）：HMAC(HS256) 签名令牌 + 演示用 API Key 允许列表
// 生产须替换为正式 IdP / 公钥验签 + 刷新令牌 + 密钥托管
import crypto from 'node:crypto'

const SECRET = process.env.RZQ_JWT_SECRET || 'rongzhiqiao-demo-secret-change-me'
const TTL_SEC = Number(process.env.RZQ_TOKEN_TTL || 3600)

// 演示允许列表：「厂家在平台协助下」由平台签发 Key（member 可下单/购物车，platform 可查审计）
const ALLOWLIST = {
  'member-demo-key': { sub: 'member-001', role: 'member' },
  'member-demo-key-2': { sub: 'member-002', role: 'member' },
  'platform-demo-key': { sub: 'platform-001', role: 'platform' }
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const b64d = (s) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'))

export function signToken(sub, role, ttlSec = TTL_SEC) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = { sub, role, iat: now, exp: now + ttlSec }
  const data = `${b64(header)}.${b64(payload)}`
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [h, p, s] = parts
  const expect = crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url')
  if (expect !== s) return null // 签名不符
  let payload
  try {
    payload = b64d(p)
  } catch {
    return null
  }
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null // 过期
  return payload
}

export function login(apiKey) {
  const u = ALLOWLIST[apiKey]
  if (!u) return null
  return { token: signToken(u.sub, u.role), sub: u.sub, role: u.role }
}

export function authFromHeader(req) {
  const auth = req.headers['authorization'] || req.headers['Authorization']
  if (!auth || !auth.startsWith('Bearer ')) return null
  return verifyToken(auth.slice(7).trim())
}
