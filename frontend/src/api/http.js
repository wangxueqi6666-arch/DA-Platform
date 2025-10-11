// 统一 HTTP 客户端，支持 API 基址与错误处理
const DEFAULT_API_BASE = 'http://localhost:8080'
export const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) ? import.meta.env.VITE_API_BASE : DEFAULT_API_BASE

export async function api(path, options = {}) {
  const isAbsolute = /^https?:\/\//i.test(path)
  const needsBase = path.startsWith('/api') || path.startsWith('/health') || path.startsWith('/dataset')
  const url = isAbsolute ? path : (needsBase ? `${API_BASE}${path}` : path)
  const res = await fetch(url, options)
  let json = null
  try {
    json = await res.json()
  } catch {
    json = {}
  }
  if (!res.ok) {
    const msg = json?.message || json?.error || res.statusText || '请求失败'
    throw new Error(msg)
  }
  return json
}

export async function apiGet(path) {
  return api(path)
}

export async function apiPost(path, body) {
  return api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
}

export async function apiPatch(path, body) {
  return api(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
}