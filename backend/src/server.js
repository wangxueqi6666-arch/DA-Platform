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
// 简单的 MIME 类型映射
const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
  '.json': 'application/json', '.csv': 'text/csv', '.tsv': 'text/tab-separated-values', '.txt': 'text/plain', '.pcd': 'application/octet-stream', '.ply': 'application/octet-stream'
}

// 通用文件读取接口（谨慎使用，仅用于本地开发）
app.get('/api/file', (req, res) => {
  try {
    const filePath = String(req.query.path || '').trim()
    if (!filePath) return res.status(400).json({ ok: false, message: 'path is required' })
    if (!fs.existsSync(filePath)) return res.status(404).json({ ok: false, message: 'file not found', path: filePath })
    const ext = path.extname(filePath).toLowerCase()
    const mime = MIME[ext] || 'application/octet-stream'
    res.type(mime)
    res.sendFile(filePath)
  } catch (e) {
    res.status(500).json({ ok: false, message: e?.message || String(e) })
  }
})

// ===== BEV 解析辅助函数 =====
function normalizeElement(e, idx = 0) {
  const id = e.id || e.ID || `E${String(idx + 1).padStart(2, '0')}`
  const type = e.type || e.kind || e.category || '未知类型'
  const color = e.color || e.colour || e.lineColor || '白色'
  const width = Number(e.width ?? e.lineWidth ?? 0.15) || 0.15
  const out = { id, type, color, width }
  if (e.points) out.points = e.points
  if (e.shape) out.shape = e.shape
  if (e.position) out.position = e.position
  if (e.bbox) out.bbox = e.bbox
  return out
}

function parseCSV(text) {
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim().length)
  if (!lines.length) return []
  const sep = lines[0].includes('\t') ? '\t' : ','
  const headers = lines[0].split(new RegExp(sep)).map((h) => h.trim())
  const idx = (nameArr) => {
    for (const name of nameArr) {
      const i = headers.findIndex((h) => h.toLowerCase() === name.toLowerCase())
      if (i >= 0) return i
    }
    return -1
  }
  const idIdx = idx(['id','ID'])
  const typeIdx = idx(['type','kind','category'])
  const colorIdx = idx(['color','colour','lineColor'])
  const widthIdx = idx(['width','lineWidth'])
  const out = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(new RegExp(sep)).map((c) => c.trim())
    const e = {
      id: idIdx >= 0 ? cols[idIdx] : undefined,
      type: typeIdx >= 0 ? cols[typeIdx] : undefined,
      color: colorIdx >= 0 ? cols[colorIdx] : undefined,
      width: widthIdx >= 0 ? parseFloat(cols[widthIdx]) : undefined,
    }
    out.push(normalizeElement(e, i - 1))
  }
  return out
}

function tryParseJSON(text) {
  const trimmed = String(text).trim()
  // NDJSON: 每行一个 JSON
  const lines = trimmed.split(/\r?\n/)
  if (lines.length > 1 && lines.every((l) => {
    const s = l.trim(); if (!s) return true; try { JSON.parse(s); return true } catch { return false }
  })) {
    const arr = lines.filter((l) => l.trim().length).map((l) => JSON.parse(l.trim()))
    return arr
  }
  return JSON.parse(trimmed)
}

function collectElementsFromDir(rootDir) {
  const allowed = new Set(['.bev', '.json', '.ndjson', '.csv', '.tsv', '.txt'])
  const filesParsed = []
  const elements = []
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
        const depth = rel.split(path.sep).length - 1
        if (depth < 2) walk(abs, rel)
        continue
      }
      const ext = path.extname(ent.name).toLowerCase()
      if (!allowed.has(ext)) continue
      try {
        const text = fs.readFileSync(abs, 'utf-8')
        let arr = []
        if (ext === '.csv' || ext === '.tsv') {
          arr = parseCSV(text)
        } else {
          try {
            const data = tryParseJSON(text)
            arr = Array.isArray(data) ? data : Array.isArray(data?.elements) ? data.elements : Array.isArray(data?.objects) ? data.objects : []
            arr = arr.map((e, idx) => normalizeElement(e, idx))
          } catch {
            // 尝试作为 CSV 解析
            arr = parseCSV(text)
          }
        }
        if (arr.length) {
          filesParsed.push(rel)
          elements.push(...arr)
        }
      } catch (e) {
        // 忽略单文件错误，继续其它文件
      }
    }
  }
  walk(rootDir)
  return { filesParsed, elements, count: elements.length }
}

// 从指定目录解析 BEV 元素
app.get('/api/bev/elements', (req, res) => {
  try {
    const dir = String(req.query.dir || '').trim() || DATASET_DIR
    if (!dir) return res.status(400).json({ ok: false, message: 'dir is required' })
    if (!fs.existsSync(dir)) return res.status(404).json({ ok: false, message: 'directory not found', dir })
    const { filesParsed, elements, count } = collectElementsFromDir(dir)
    res.json({ ok: true, dir, filesParsed, count, elements })
  } catch (e) {
    res.status(500).json({ ok: false, message: e?.message || String(e) })
  }
})
// 根据 BEV 大图路径自动匹配并解析关联元素
function matchElementsForImage(imageAbs) {
  const imageDir = path.dirname(imageAbs)
  const base = path.basename(imageAbs).replace(/\.(jpg|jpeg|png|webp|bmp|gif)$/i, '')
  const baseShort = base.replace(/_rel_elevation$/i, '')
  const allowedExt = new Set(['.bev', '.json', '.ndjson', '.csv', '.tsv', '.txt'])
  const candidatesDirs = Array.from(new Set([
    imageDir,
    path.join(imageDir, '..'),
    path.join(imageDir, '../..'),
    path.join(imageDir, 'annotations'),
    path.join(imageDir, 'labels'),
    path.join(imageDir, '..', '4D_marking'),
    path.join(imageDir, '..', '..', '4D_marking'),
    path.join(imageDir, '..', '2D_bev'),
  ].map((p) => path.resolve(p))))

  const matchedFiles = []
  const elements = []
  for (const dir of candidatesDirs) {
    if (!fs.existsSync(dir)) continue
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { continue }
    for (const ent of entries) {
      if (!ent.isFile()) continue
      const ext = path.extname(ent.name).toLowerCase()
      if (!allowedExt.has(ext)) continue
      const nameNoExt = ent.name.slice(0, ent.name.length - ext.length)
      const maybeMatch = nameNoExt.includes(base) || nameNoExt.includes(baseShort)
      if (!maybeMatch) continue
      const abs = path.resolve(dir, ent.name)
      try {
        const text = fs.readFileSync(abs, 'utf-8')
        let arr = []
        if (ext === '.csv' || ext === '.tsv') {
          arr = parseCSV(text)
        } else {
          try {
            const data = tryParseJSON(text)
            arr = Array.isArray(data) ? data : Array.isArray(data?.elements) ? data.elements : Array.isArray(data?.objects) ? data.objects : []
            arr = arr.map((e, idx) => normalizeElement(e, idx))
          } catch {
            arr = parseCSV(text)
          }
        }
        if (arr.length) {
          matchedFiles.push(abs)
          elements.push(...arr)
        }
      } catch {
        // 跳过无法解析的文件
      }
    }
  }
  return { matchedFiles, elements }
}

app.get('/api/bev/match', (req, res) => {
  try {
    const image = String(req.query.image || '').trim()
    if (!image) return res.status(400).json({ ok: false, message: 'image path is required' })
    if (!fs.existsSync(image)) return res.status(404).json({ ok: false, message: 'image not found', image })
    const { matchedFiles, elements } = matchElementsForImage(image)
    const image_url = `/api/file?path=${encodeURIComponent(image)}`
    res.json({ ok: true, image, image_url, matched_files: matchedFiles, count: elements.length, elements })
  } catch (e) {
    res.status(500).json({ ok: false, message: e?.message || String(e) })
  }
})