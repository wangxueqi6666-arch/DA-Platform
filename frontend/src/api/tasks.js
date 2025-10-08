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
  const res = await fetch(`/api/tasks?${params.toString()}`)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || '获取任务失败')
  return json
}

export async function claimTasks({ kind, count, role, status }) {
  const res = await fetch('/api/tasks/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, count, role, status }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || '领取任务失败')
  return json
}

export async function submitTask({ id }) {
  const res = await fetch('/api/tasks/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || '提交失败')
  return json
}

export async function reviewTask({ id, action }) {
  const res = await fetch('/api/tasks/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || '审核操作失败')
  return json
}

export async function acceptTask({ id, action }) {
  const res = await fetch('/api/tasks/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || '验收操作失败')
  return json
}

export async function returnTask({ id }) {
  const res = await fetch('/api/tasks/return', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || '退回失败')
  return json
}