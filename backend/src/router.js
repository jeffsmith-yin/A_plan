// 轻量路由表（零依赖）
// Map<"METHOD /path", {handler, authRequired}>
// 支持路径参数：:id 风格占位

export class Router {
  constructor() {
    this._routes = [] // [{method, pattern, regex, paramKeys, handler, auth}]
  }

  // pattern: "GET /api/users" 或 "DELETE /api/roles/:id"
  add(method, pattern, handler, auth = false) {
    const paramKeys = []
    const regexStr = pattern.replace(/:([^/]+)/g, (_, k) => {
      paramKeys.push(k)
      return '([^/]+)'
    })
    this._routes.push({
      method: method.toUpperCase(),
      pattern,
      regex: new RegExp('^' + regexStr + '$'),
      paramKeys,
      handler,
      auth
    })
  }

  match(method, path) {
    const m = method.toUpperCase()
    for (const r of this._routes) {
      if (r.method !== m) continue
      const m2 = path.match(r.regex)
      if (m2) {
        const params = {}
        r.paramKeys.forEach((k, i) => (params[k] = m2[i + 1]))
        return { handler: r.handler, auth: r.auth, params }
      }
    }
    return null
  }
}
