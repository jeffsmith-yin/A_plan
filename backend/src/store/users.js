// 用户管理（零依赖）
// 数据模型：phone → {phone, name, isSuperAdmin, isAdmin, deleted, createdAt}
import { loadJson, saveJson } from '../lib/persist.js'

const FILE = 'users.json'

function load() { return loadJson(FILE, []) }
function save(u) { saveJson(FILE, u) }

export function getUsers() {
  return load().filter((u) => !u.deleted).map(({ passwordHash, deleted, ...rest }) => rest)
}

export function getUser(phone) {
  const u = load().find((u) => u.phone === phone && !u.deleted)
  if (!u) return null
  const { passwordHash, deleted, ...rest } = u
  return rest
}

export function updateUser(phone, updates) {
  const users = load()
  const idx = users.findIndex((u) => u.phone === phone)
  if (idx === -1) return null
  Object.assign(users[idx], updates)
  save(users)
  const { passwordHash, deleted, ...rest } = users[idx]
  return rest
}
