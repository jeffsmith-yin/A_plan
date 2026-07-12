// 安全 JSON 解析器（提取自 agent-expert，零依赖）
// 超体限 413 / 畸形 JSON 400 / 空体→{} / req.destroy() 防继续读入

export function readJson(req, res, limit = 1_000_000) {
  return new Promise((resolve) => {
    let responded = false
    let size = 0
    let body = ''
    const fail = (code, msg) => {
      if (responded) return
      responded = true
      res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: msg }))
      req.destroy()
      resolve(null)
    }
    req.on('data', (c) => {
      if (responded) return
      size += c.length
      if (size > limit) {
        fail(413, 'payload too large')
        return
      }
      body += c
    })
    req.on('end', () => {
      if (responded) return
      if (body === '') {
        responded = true
        resolve({})
        return
      }
      try {
        const parsed = JSON.parse(body)
        responded = true
        resolve(parsed)
      } catch {
        fail(400, 'invalid json')
      }
    })
    req.on('error', () => {
      if (!responded) fail(400, 'bad request')
    })
  })
}

// 统一 JSON 响应
export function sendJson(res, status, obj, extraHeaders = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders })
  res.end(JSON.stringify(obj))
}
