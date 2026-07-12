// JSON 文件持久化工具（提取自 agent-expert 模式，零依赖）
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = join(__dirname, '..', '..', 'data')

export function ensureDataDir() {
  if (!existsSync(DATA)) mkdirSync(DATA, { recursive: true })
}

export function loadJson(filename, fallback = {}) {
  ensureDataDir()
  const p = join(DATA, filename)
  if (!existsSync(p)) return fallback
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return fallback
  }
}

export function saveJson(filename, obj) {
  ensureDataDir()
  writeFileSync(join(DATA, filename), JSON.stringify(obj))
}

export function dataPath(filename) {
  return join(DATA, filename)
}
