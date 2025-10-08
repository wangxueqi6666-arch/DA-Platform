import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 8080

app.use(cors())
app.use(express.json())

// Health
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'da-platform-backend', time: new Date().toISOString() })
})

// Demo data
const demoUsers = [
  { id: 1, username: 'alice', email: 'alice@example.com', roles: ['admin'], status: 'active' },
  { id: 2, username: 'bob', email: 'bob@example.com', roles: ['annotator'], status: 'disabled' },
]

// Users API (mock)
app.get('/api/users', (_req, res) => {
  res.json(demoUsers)
})

app.post('/api/users', (req, res) => {
  const { username, email, roles } = req.body || {}
  if (!username || !email) return res.status(400).json({ error: 'username and email are required' })
  const id = demoUsers.length ? demoUsers[demoUsers.length - 1].id + 1 : 1
  const user = { id, username, email, roles: roles || ['annotator'], status: 'active' }
  demoUsers.push(user)
  res.status(201).json(user)
})

app.patch('/api/users/:id/status', (req, res) => {
  const id = Number(req.params.id)
  const { status } = req.body || {}
  const idx = demoUsers.findIndex((u) => u.id === id)
  if (idx === -1) return res.status(404).json({ error: 'user not found' })
  demoUsers[idx].status = status === 'disabled' ? 'disabled' : 'active'
  res.json(demoUsers[idx])
})

// Frames API (mock)
app.get('/api/frames', (_req, res) => {
  res.json({ total: 60 })
})

app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`)
})