// 融智桥 · API 客户端（零依赖 fetch）
// 封装后端 API 调用：Bearer 令牌注入、401 处理、JSON 解析
// 后端不可达时返回 null，调用方自动回退 localStorage

let API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3100'
let token = localStorage.getItem('__rzq_api_token__') || null

export function setApiBase(url: string) {
  API_BASE = url
}

export function getApiBase(): string {
  return API_BASE
}

export function setToken(t: string | null) {
  token = t
  if (t) {
    localStorage.setItem('__rzq_api_token__', t)
  } else {
    localStorage.removeItem('__rzq_api_token__')
  }
}

export function getToken(): string | null {
  return token
}

async function apiFetch(
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; json: any } | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = 'Bearer ' + token
    }
    const opts: RequestInit = { method, headers }
    if (body !== undefined) {
      opts.body = JSON.stringify(body)
    }
    const r = await fetch(API_BASE + path, opts)
    const json = await r.json().catch(() => null)
    return { status: r.status, json }
  } catch {
    // 后端不可达 → 返回 null，调用方自动 fallback localStorage
    return null
  }
}

// 检查后端是否可达（用于首次判断）
export async function isBackendAvailable(): Promise<boolean> {
  try {
    const r = await fetch(API_BASE + '/api/health')
    return r.ok
  } catch {
    return false
  }
}

// 公开端点
export function apiHealth() {
  return apiFetch('GET', '/api/health')
}

export function apiRegister(phone: string, password: string, name?: string) {
  return apiFetch('POST', '/api/auth/register', { phone, password, name })
}

export function apiLogin(phone: string, password: string) {
  return apiFetch('POST', '/api/auth/login', { phone, password })
}

// 受控端点
export function apiMe() {
  return apiFetch('GET', '/api/me')
}

export function apiCreateRole(role: any) {
  return apiFetch('POST', '/api/roles', role)
}

export function apiDeleteRole(id: string) {
  return apiFetch('DELETE', '/api/roles/' + id)
}

export function apiGetNDA() {
  return apiFetch('GET', '/api/nda')
}

export function apiSignNDA(roleId: string, signerName: string, role: string) {
  return apiFetch('POST', '/api/nda/sign', { roleId, signerName, role })
}

export function apiRenewNDA(roleId: string) {
  return apiFetch('POST', '/api/nda/renew', { roleId })
}

export function apiGetCart() {
  return apiFetch('GET', '/api/cart')
}

export function apiAddToCart(productId: string) {
  return apiFetch('POST', '/api/cart/add', { productId })
}

export function apiRemoveFromCart(productId: string) {
  return apiFetch('POST', '/api/cart/remove', { productId })
}

export function apiCheckout() {
  return apiFetch('POST', '/api/cart/checkout')
}

export function apiGetOrders() {
  return apiFetch('GET', '/api/orders')
}

export function apiGetWallet() {
  return apiFetch('GET', '/api/wallet')
}

export function apiWithdraw(amount: number, method: string) {
  return apiFetch('POST', '/api/wallet/withdraw', { amount, method })
}

export function apiGetDashboard() {
  return apiFetch('GET', '/api/dashboard')
}

export function apiGetAudit() {
  return apiFetch('GET', '/api/audit')
}
