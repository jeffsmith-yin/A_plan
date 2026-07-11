// 知识库 RAG 检索（MVP 用词法检索；生产环境替换为 embedding 向量检索，见 README）
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const KB_PATH = path.resolve(__dirname, '../knowledge-base/manufacturing-skills.json')

export function loadKB() {
  const raw = fs.readFileSync(KB_PATH, 'utf-8')
  return JSON.parse(raw)
}

// 构建全局关键词词典（去重）
export function buildLexicon(kb) {
  const set = new Set()
  for (const s of kb.skills) (s.keywords || []).forEach((k) => set.add(k))
  return [...set]
}

// 从文本中抽取命中的关键词
export function extractKeywords(text, lexicon) {
  return lexicon.filter((k) => text.includes(k))
}

// 检索：返回命中的关键词 + 按分数降序的 skill 列表
export function retrieve(text, kb, topK = 3) {
  const lexicon = buildLexicon(kb)
  const hits = extractKeywords(text, lexicon)
  const scored = kb.skills
    .map((s) => {
      const kw = s.keywords || []
      const hitKw = kw.filter((k) => text.includes(k))
      return { skill: s, score: hitKw.length, hitKw }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  return { hits, ranked: scored.slice(0, topK) }
}
