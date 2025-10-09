export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'

export async function getDatasetFrames() {
  const res = await fetch(`${API_BASE}/api/dataset/frames`)
  if (!res.ok) throw new Error(`Failed to load frames: HTTP ${res.status}`)
  return res.json()
}