// 鉴权：HMAC HS256 令牌签发/校验（复用 agent-expert 模式，零依赖）
// 用户库：phone → {phone, name, passwordHash, isSuperAdmin, isAdmin, deleted, createdAt}
import { createHmac, randomBytes } from 'node:crypto'
import { loadJson, saveJson } from './lib/persist.js'

const SECRET = process.env.JWT_SECRET || 'rzq-backend-secret-demo'
const USERS_FILE = 'users.json'

// 简易密码哈希（演示；生产用 bcrypt/argon2）
function hashPassword(password) {
  return createHmac('sha256', SECRET).update(password).digest('hex')
}

// 加载用户库
function loadUsers() {
  return loadJson(USERS_FILE, [])
}
function saveUsers(users) {
  saveJson(USERS_FILE, users)
}

// 注册（首个用户自动超管）
export function register(phone, password, name) {
  const users = loadUsers()
  if (users.find((u) => u.phone === phone && !u.deleted)) {
    return { ok: false, error: '手机号已注册' }
  }
  const isFirst = users.length === 0
  const user = {
    phone,
    name: name || phone,
    passwordHash: hashPassword(password),
    isSuperAdmin: isFirst,
    isAdmin: false,
    deleted: false,
    createdAt: new Date().toISOString()
  }
  users.push(user)
  saveUsers(users)
  return { ok: true, user: sanitize(user) }
}

// 登录
export function login(phone, password) {
  const users = loadUsers()
  const u = users.find((u) => u.phone === phone && !u.deleted)
  if (!u) return { ok: false, error: '用户不存在或已注销' }
  if (u.passwordHash !== hashPassword(password)) return { ok: false, error: '密码错误' }
  return { ok: true, user: sanitize(u) }
}

// 签发令牌
export function signToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.phone,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
      isAdmin: user.isAdmin,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 // 24h
    })
  ).toString('base64url')
  const sig = createHmac('sha256', SECRET).update(header + '.' + payload).digest('base64url')
  return header + '.' + payload + '.' + sig
}

// 验证令牌
export function verifyToken(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const sig = createHmac('sha256', SECRET).update(parts[0] + '.' + parts[1]).digest('base64url')
    if (sig !== parts[2]) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

// 从请求头提取并验证
export function authFromHeader(req) {
  const h = req.headers['authorization']
  if (!h || !h.startsWith('Bearer ')) return null
  return verifyToken(h.slice(7))
}

// 脱敏用户（不泄露密码哈希）
function sanitize(u) {
  const { passwordHash, deleted, ...rest } = u
  return rest
}

// 获取用户
export function getUser(phone) {
  const users = loadUsers()
  const u = users.find((u) => u.phone === phone && !u.deleted)
  return u ? sanitize(u) : null
}

// 更新用户
export function updateUser(phone, updates) {
  const users = loadUsers()
  const idx = users.findIndex((u) => u.phone === phone)
  if (idx === -1) return null
  Object.assign(users[idx], updates)
  saveUsers(users)
  return sanitize(users[idx])
}

// 软注销
export function deleteUser(phone) {
  const users = loadUsers()
  const idx = users.findIndex((u) => u.phone === phone)
  if (idx === -1) return false
  users[idx].deleted = true
  saveUsers(users)
  return true
}

// 获取全部用户（脱敏）
export function listUsers() {
  return loadUsers().filter((u) => !u.deleted).map(sanitize)
}
