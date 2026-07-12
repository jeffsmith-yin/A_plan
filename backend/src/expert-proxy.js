// 反向代理：/api/expert/* → agent-expert:8787（零依赖 node:http）
// agent-expert 不加 CORS，仅 backend 可访问；鉴权令牌透传
import http from 'node:http'

const EXPERT_PORT = Number(process.env.EXPERT_PORT) || 8787
const EXPERT_HOST = process.env.EXPERT_HOST || 'localhost'

export function proxyExpertRequest(req, res) {
  return new Promise((resolve) => {
    const targetPath = req.url.replace(/^\/api\/expert/, '') || '/'
    const headers = { ...req.headers }
    // 清理 hop-by-hop 头
    delete headers['host']
    delete headers['connection']

    const proxyReq = http.request(
      {
        hostname: EXPERT_HOST,
        port: EXPERT_PORT,
        path: targetPath,
        method: req.method,
        headers,
        timeout: 15000
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers)
        proxyRes.pipe(res)
        proxyRes.on('end', resolve)
      }
    )

    proxyReq.on('error', (e) => {
      if (!res.headersSent) {
        res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ error: 'expert service unavailable', detail: e.message }))
      }
      resolve()
    })

    proxyReq.on('timeout', () => {
      proxyReq.destroy()
      if (!res.headersSent) {
        res.writeHead(504, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ error: 'expert service timeout' }))
      }
      resolve()
    })

    // 透传请求体
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      req.pipe(proxyReq)
    } else {
      proxyReq.end()
    }
  })
}
