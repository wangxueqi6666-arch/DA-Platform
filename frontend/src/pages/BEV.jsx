import React, { useEffect, useMemo, useState } from 'react'

export default function BEV() {
  const loadLocal = () => {
    try {
      const raw = localStorage.getItem('bev_elements')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }
  const [elements, setElements] = useState(loadLocal())
  const [focused, setFocused] = useState(null)
  const [importErr, setImportErr] = useState(null)
  const [dirPath, setDirPath] = useState('/Users/marvin/Downloads/113114')
  const [bevImagePath, setBevImagePath] = useState('/Users/marvin/Downloads/113114/data_proc/4D_marking/2D_bev/20250716_113114_0000_rel_elevation.jpg')
  const [bevImageUrl, setBevImageUrl] = useState('')
  const [matchInfo, setMatchInfo] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem('bev_elements', JSON.stringify(elements))
    } catch {}
  }, [elements])

  const normalizeElement = (e, idx) => {
    const id = e.id || e.ID || `E${String(idx + 1).padStart(2, '0')}`
    const type = e.type || e.kind || e.category || '未知类型'
    const color = e.color || e.colour || e.lineColor || '白色'
    const width = Number(e.width ?? e.lineWidth ?? 0.15) || 0.15
    const extra = {}
    if (e.points) extra.points = e.points
    if (e.shape) extra.shape = e.shape
    if (e.position) extra.position = e.position
    return { id, type, color, width, ...extra }
  }

  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length)
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

  const tryParseJSON = (text) => {
    const trimmed = text.trim()
    // NDJSON
    if (trimmed.includes('\n') && trimmed.split(/\r?\n/).every((l) => {
      const s = l.trim(); if (!s) return true; try { JSON.parse(s); return true } catch { return false }
    })) {
      const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length)
      const arr = lines.map((l) => JSON.parse(l.trim()))
      return arr
    }
    // Regular JSON
    return JSON.parse(trimmed)
  }

  const importFiles = async (files) => {
    setImportErr(null)
    const imported = []
    for (const f of files) {
      const text = await f.text()
      const ext = (f.name.split('.').pop() || '').toLowerCase()
      try {
        if (['json','bev','ndjson'].includes(ext)) {
          const data = tryParseJSON(text)
          const arr = Array.isArray(data) ? data : Array.isArray(data?.elements) ? data.elements : []
          if (!arr.length) throw new Error('JSON格式未包含元素数组')
          arr.forEach((e, idx) => imported.push(normalizeElement(e, idx)))
        } else if (['csv','tsv'].includes(ext)) {
          const arr = parseCSV(text)
          if (!arr.length) throw new Error('CSV/TSV未解析到元素')
          imported.push(...arr)
        } else if (['txt'].includes(ext)) {
          // try JSON first, then CSV
          try {
            const data = tryParseJSON(text)
            const arr = Array.isArray(data) ? data : Array.isArray(data?.elements) ? data.elements : []
            if (!arr.length) throw new Error('')
            arr.forEach((e, idx) => imported.push(normalizeElement(e, idx)))
          } catch {
            const arr = parseCSV(text)
            if (!arr.length) throw new Error('TXT未识别为JSON或CSV')
            imported.push(...arr)
          }
        } else {
          // Default attempt JSON, then CSV
          try {
            const data = tryParseJSON(text)
            const arr = Array.isArray(data) ? data : Array.isArray(data?.elements) ? data.elements : []
            if (!arr.length) throw new Error('')
            arr.forEach((e, idx) => imported.push(normalizeElement(e, idx)))
          } catch {
            const arr = parseCSV(text)
            if (!arr.length) throw new Error('未知扩展名，未解析到元素')
            imported.push(...arr)
          }
        }
      } catch (err) {
        setImportErr(`文件 ${f.name} 解析失败：${err.message || err}`)
      }
    }
    if (imported.length) setElements((prev) => [...prev, ...imported])
  }

  const loadFromDir = async () => {
    setImportErr(null)
    try {
      const url = `http://localhost:8080/api/bev/elements?dir=${encodeURIComponent(dirPath)}`
      const resp = await fetch(url)
      const data = await resp.json()
      if (!data.ok) throw new Error(data.message || '加载失败')
      if (!Array.isArray(data.elements) || !data.elements.length) throw new Error('目录中未解析到元素')
      setElements(data.elements)
    } catch (e) {
      setImportErr(`从目录加载失败：${e.message || e}`)
    }
  }

  const loadBevImage = async () => {
    setImportErr(null)
    try {
      const url = `http://localhost:8080/api/file?path=${encodeURIComponent(bevImagePath)}`
      // 先尝试 HEAD 请求验证
      const resp = await fetch(url, { method: 'GET' })
      if (!resp.ok) throw new Error('无法加载 BEV 大图')
      setBevImageUrl(url)
    } catch (e) {
      setImportErr(`加载BEV大图失败：${e.message || e}`)
    }
  }

  const autoMatchAndLoad = async () => {
    setImportErr(null)
    try {
      const url = `http://localhost:8080/api/bev/match?image=${encodeURIComponent(bevImagePath)}`
      const resp = await fetch(url)
      const data = await resp.json()
      if (!data.ok) throw new Error(data.message || '自动匹配失败')
      setBevImageUrl(data.image_url)
      setElements(data.elements || [])
      setMatchInfo({ matched: data.matched_files?.length || 0, files: data.matched_files || [] })
    } catch (e) {
      setImportErr(`自动匹配失败：${e.message || e}`)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 320px', gap: 12, height: 'calc(100vh - 120px)' }}>
      <div style={panel}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>参考视图</div>
        <div style={subBox}>
          {bevImageUrl ? (
            <img src={bevImageUrl} alt="BEV底图" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 6 }} />
          ) : (
            <span>可显示BEV参考图或示例车道线/箭头等</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button style={btn}>切换底图</button>
          <button style={btn}>显示网格</button>
          <label style={{ ...btn, background: '#10b981', cursor: 'pointer' }}>
            导入BEV文件
            <input type="file" accept=".bev,.json,.ndjson,.csv,.tsv,.txt" multiple style={{ display: 'none' }} onChange={(e) => importFiles(e.target.files)} />
          </label>
          <button style={{ ...btn, background: '#ef4444' }} onClick={() => setElements([])}>清空</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input value={bevImagePath} onChange={(e) => setBevImagePath(e.target.value)} placeholder="输入BEV大图绝对路径" style={{ flex: 1, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6 }} />
          <button style={{ ...btn, background: '#22c55e' }} onClick={loadBevImage}>加载大图</button>
          <button style={{ ...btn, background: '#f59e0b' }} onClick={autoMatchAndLoad}>自动匹配并加载元素</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input value={dirPath} onChange={(e) => setDirPath(e.target.value)} placeholder="输入本地目录路径，例如 /Users/marvin/Downloads/113114" style={{ flex: 1, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6 }} />
          <button style={{ ...btn, background: '#0ea5e9' }} onClick={loadFromDir}>从路径加载</button>
        </div>
        {matchInfo && <div style={{ marginTop: 8, color: '#374151', fontSize: 12 }}>匹配到文件：{matchInfo.matched} 个</div>}
        {importErr && <div style={{ marginTop: 8, color: '#ef4444', fontSize: 12 }}>导入错误：{importErr}</div>}
      </div>

      <div style={panel}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>BEV标注主区</div>
        <div style={bevBox}>
          {bevImageUrl ? (
            <img src={bevImageUrl} alt="BEV底图" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }} />
          ) : (
            <span>在俯视图中进行多边形/线段/矩形标注，支持缩放与拖拽</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button style={btn}>绘制线段</button>
          <button style={btn}>绘制多边形</button>
          <button style={btn}>保存</button>
          <button style={btn}>提交到审核员</button>
        </div>
      </div>

      <div style={panel}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>元素属性</div>
        <div style={{ marginBottom: 8, fontSize: 12, color: '#9ca3af' }}>已加载元素：{elements.length} 个</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {elements.map((e) => (
            <li key={e.id} style={{ ...listItem, background: focused === e.id ? '#e0f2fe' : '#fff' }} onClick={() => setFocused(e.id)}>
              <div style={{ fontWeight: 600 }}>{e.id}</div>
              <div style={{ color: '#6b7280', fontSize: 12 }}>类型：{e.type}｜颜色：{e.color}｜宽度：{e.width}m</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const panel = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, overflow: 'auto' }
const subBox = { height: 260, border: '1px dashed #cbd5e1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }
const bevBox = { height: 460, border: '1px dashed #cbd5e1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }
const btn = { padding: '8px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }
const listItem = { border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, marginBottom: 8, cursor: 'pointer' }