import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 8080
const DATASET_DIR = process.env.DATASET_DIR || path.resolve(process.env.HOME || '', 'Downloads/scene_01')

app.use(cors())
app.use(express.json())

// 将本地数据目录暴露为静态资源目录，便于前端直接访问文件
try {
  if (fs.existsSync(DATASET_DIR)) {
    app.use('/dataset', express.static(DATASET_DIR))
    console.log(`[dataset] serving local dir: ${DATASET_DIR}`)
  } else {
    console.warn('[dataset] directory not found:', DATASET_DIR)
  }
} catch (e) {
  console.warn('[dataset] failed to setup static serving:', e?.message || e)
}

// 帮助函数：遍历目录，收集支持的帧/资源文件
function collectFrames(rootDir) {
  const supported = new Set(['.jpg', '.jpeg', '.png', '.bmp', '.webp', '.gif', '.pcd', '.ply', '.json'])
  const results = []
  const walk = (dir, relBase = '') => {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of entries) {
      const abs = path.join(dir, ent.name)
      const rel = path.join(relBase, ent.name)
      if (ent.isDirectory()) {
        // 限制递归深度以避免大目录（最多两层）
        const depth = rel.split(path.sep).length - 1
        if (depth < 2) walk(abs, rel)
        continue
      }
      const ext = path.extname(ent.name).toLowerCase()
      if (!supported.has(ext)) continue
      const type = ['.pcd', '.ply'].includes(ext) ? 'pointcloud' : (ext === '.json' ? 'meta' : 'image')
      results.push({
        name: ent.name,
        type,
        ext,
        // 提供可访问的静态 URL 路径
        url: `/dataset/${rel.replace(/\\/g, '/')}`,
        rel,
      })
    }
  }
  walk(rootDir)
  return results
}

// Root page for quick check
app.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(`
    <!doctype html>
    <html lang="zh-CN">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>DA Platform Backend</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; margin:0; background:#f8fafc; color:#0f172a}
        .wrap{max-width:880px; margin:40px auto; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:20px; box-shadow:0 8px 20px rgba(0,0,0,0.06)}
        .btn{display:inline-block; padding:8px 12px; border:1px solid #e5e7eb; border-radius:8px; text-decoration:none; color:#1f2937; background:#f9fafb; margin-right:8px}
        .btn.primary{background:#2563eb; border-color:#2563eb; color:#fff}
        code{background:#f1f5f9; padding:2px 6px; border-radius:6px}
      </style>
    </head>
    <body>
      <div class="wrap">
        <h2>DA Platform 后端服务</h2>
        <p>这是后端 API 服务的入口页面，前端界面请访问 <code>http://localhost:5173</code>。</p>
        <p>快速检查：</p>
        <p>
          <a class="btn primary" href="/health">健康检查 /health</a>
          <a class="btn" href="/api/users">示例用户 /api/users</a>
          <a class="btn" href="/api/frames">帧数接口 /api/frames</a>
          <a class="btn" href="/api/dataset/info">数据集信息 /api/dataset/info</a>
          <a class="btn" href="/api/dataset/frames">数据集帧列表 /api/dataset/frames</a>
          <a class="btn" href="/dataset">静态资源根 /dataset</a>
        </p>
      </div>
    </body>
    </html>
  `)
})

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

// 数据集信息摘要
app.get('/api/dataset/info', (_req, res) => {
  try {
    const exists = fs.existsSync(DATASET_DIR)
    if (!exists) return res.status(404).json({ ok: false, message: 'DATASET_DIR not found', DATASET_DIR })
    const frames = collectFrames(DATASET_DIR)
    const stats = {
      total: frames.length,
      images: frames.filter((f) => f.type === 'image').length,
      pointclouds: frames.filter((f) => f.type === 'pointcloud').length,
      metas: frames.filter((f) => f.type === 'meta').length,
      DATASET_DIR,
    }
    res.json({ ok: true, ...stats })
  } catch (e) {
    res.status(500).json({ ok: false, message: e?.message || String(e) })
  }
})

// 帧/资源列表
app.get('/api/dataset/frames', (_req, res) => {
  try {
    const exists = fs.existsSync(DATASET_DIR)
    if (!exists) return res.status(404).json({ ok: false, message: 'DATASET_DIR not found', DATASET_DIR })
    const frames = collectFrames(DATASET_DIR)
    res.json({ ok: true, DATASET_DIR, frames })
  } catch (e) {
    res.status(500).json({ ok: false, message: e?.message || String(e) })
  }
})

app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`)
})