import { api, apiPost } from './http'

export async function fetchTasks({ kind, status, type, start, end, tag, page = 1, pageSize = 10 }) {
  const params = new URLSearchParams()
  if (kind) params.append('kind', kind)
  if (status) params.append('status', status)
  if (type && type !== '全部') params.append('type', type)
  if (start) params.append('start', start)
  if (end) params.append('end', end)
  if (tag) params.append('tag', tag)
  params.append('page', String(page))
  params.append('pageSize', String(pageSize))
  return api(`/api/tasks?${params.toString()}`)
}

export async function claimTasks({ kind, count, role, status }) {
  return apiPost('/api/tasks/claim', { kind, count, role, status })
}

export async function submitTask({ id }) {
  return apiPost('/api/tasks/submit', { id })
}

export async function reviewTask({ id, action }) {
  return apiPost('/api/tasks/review', { id, action })
}

export async function acceptTask({ id, action }) {
  return apiPost('/api/tasks/accept', { id, action })
}

export async function returnTask({ id }) {
  return apiPost('/api/tasks/return', { id })
}