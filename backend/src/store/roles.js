// 角色管理（零依赖）
// 数据模型：RoleCard = {id, role, secondaryRole, personPhone, name, title, intro, tags, referrerId, score}
// 持久化到 data/roles.json
import { loadJson, saveJson } from '../lib/persist.js'

const FILE = 'roles.json'

function load() { return loadJson(FILE, []) }
function save(r) { saveJson(FILE, r) }

export function getRoles() {
  return load()
}

export function getRolesByPhone(phone) {
  return load().filter((r) => r.personPhone === phone)
}

export function getRoleById(id) {
  return load().find((r) => r.id === id) || null
}

export function saveRole(role) {
  const roles = load()
  const idx = roles.findIndex((r) => r.id === role.id)
  if (idx >= 0) {
    roles[idx] = role
  } else {
    roles.push(role)
  }
  save(roles)
  return role
}

export function deleteRole(id) {
  const roles = load()
  const idx = roles.findIndex((r) => r.id === id)
  if (idx === -1) return false
  roles.splice(idx, 1)
  save(roles)
  return true
}

// 统计各类角色人数
export function getRoleStats() {
  const roles = load()
  return {
    expert: roles.filter((r) => r.role === 'expert').length,
    ai: roles.filter((r) => r.role === 'ai').length,
    enterprise: roles.filter((r) => r.role === 'enterprise').length,
    platform: roles.filter((r) => r.role === 'platform').length,
    total: roles.length
  }
}
