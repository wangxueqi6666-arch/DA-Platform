import React, { useEffect, useRef, useState } from 'react'

export default function BoxTriView({ box, points, imageSrc, onChange, style }) {
  const dims = {
    width: box?.width || 1,
    length: box?.length || 1,
    height: box?.height || 1,
  }
  const center = box?.center || { x: 0, y: dims.height / 2, z: 0 }
  const ext = 0.05 // 5cm extension

  const setDims = (next, nextCenter) => {
    const merged = { ...dims, ...next }
    if (nextCenter) {
      onChange?.({ ...merged, center: nextCenter })
    } else {
      onChange?.(merged)
    }
  }

  const Panel = ({ title, proj, labelW, labelH, sizeKeys }) => {
    const canvasRef = useRef(null)
    const [hoverEdge, setHoverEdge] = useState(null) // 'left'|'right'|'top'|'bottom'|null
    const draggingRef = useRef(null)
    const boundsRef = useRef(null)
    const [scale, setScale] = useState(1)
    const [offset, setOffset] = useState({ a: 0, b: 0 })

    useEffect(() => {
      const cvs = canvasRef.current
      if (!cvs) return
      const ctx = cvs.getContext('2d')
      const W = cvs.width, H = cvs.height
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#111827'
      ctx.fillRect(0, 0, W, H)

      const [ax, ay] = proj.axes // e.g., ['x','z']
      const halfW = dims[sizeKeys[0]] / 2, halfH = dims[sizeKeys[1]] / 2
      const minA = center[ax] - halfW - ext
      const maxA = center[ax] + halfW + ext
      const minB = center[ay] - halfH - ext
      const maxB = center[ay] + halfH + ext

      const pad = 12
      const baseA = (v) => ((v - minA) / (maxA - minA || 1)) * (W - pad * 2)
      const baseB = (v) => ((v - minB) / (maxB - minB || 1)) * (H - pad * 2)
      const mapA = (v) => pad + baseA(v) * scale + offset.a
      const mapB = (v) => pad + baseB(v) * scale + offset.b

      // draw points: extended box
      if (Array.isArray(points)) {
        ctx.fillStyle = '#64748b' // outer points
        points.forEach((p) => {
          const a = p[ax], b = p[ay]
          if (a >= minA && a <= maxA && b >= minB && b <= maxB) {
            const x = mapA(a), y = mapB(b)
            ctx.fillRect(x, y, 2, 2)
          }
        })
        // inner box highlight
        const innerMinA = center[ax] - halfW
        const innerMaxA = center[ax] + halfW
        const innerMinB = center[ay] - halfH
        const innerMaxB = center[ay] + halfH
        ctx.fillStyle = '#f59e0b'
        points.forEach((p) => {
          const a = p[ax], b = p[ay]
          if (a >= innerMinA && a <= innerMaxA && b >= innerMinB && b <= innerMaxB) {
            const x = mapA(a), y = mapB(b)
            ctx.fillRect(x, y, 2, 2)
          }
        })
      }

      // draw box rectangle (inner)
      const x0 = mapA(center[ax] - halfW)
      const y0 = mapB(center[ay] - halfH)
      const x1 = mapA(center[ax] + halfW)
      const y1 = mapB(center[ay] + halfH)
      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 2
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0)

      boundsRef.current = { x0, y0, x1, y1, pad, W, H, scale, offset, minA, maxA, minB, maxB, ax, ay }
    }, [dims.width, dims.length, dims.height, center.x, center.y, center.z, points, scale, offset.a, offset.b])

    useEffect(() => {
      const cvs = canvasRef.current
      if (!cvs) return
      const onMove = (e) => {
        const b = boundsRef.current
        if (!b) return
        const rect = cvs.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const near = 6
        const onLeft = Math.abs(x - b.x0) <= near && y >= b.y0 - near && y <= b.y1 + near
        const onRight = Math.abs(x - b.x1) <= near && y >= b.y0 - near && y <= b.y1 + near
        const onTop = Math.abs(y - b.y0) <= near && x >= b.x0 - near && x <= b.x1 + near
        const onBottom = Math.abs(y - b.y1) <= near && x >= b.x0 - near && x <= b.x1 + near
        let edge = null
        if (onLeft) edge = 'left'
        else if (onRight) edge = 'right'
        else if (onTop) edge = 'top'
        else if (onBottom) edge = 'bottom'
        setHoverEdge(edge)
        const inside = !edge && x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1
        cvs.style.cursor = edge ? (edge === 'left' || edge === 'right' ? 'ew-resize' : 'ns-resize') : (inside ? 'move' : 'default')
      }
      const onDown = (e) => {
        e.preventDefault()
        if (e.button === 2) {
          // right button: start panning
          draggingRef.current = { edge: 'pan', startX: e.clientX, startY: e.clientY, startOffset: { ...offset } }
          return
        }
        if (e.button === 0) {
          if (hoverEdge) {
            draggingRef.current = { edge: hoverEdge }
          } else {
            // start moving the whole box within view
            draggingRef.current = { edge: 'move', startX: e.clientX, startY: e.clientY, startCenter: { ...center } }
          }
        }
      }
      const onUp = (e) => {
        if (!draggingRef.current) return
        const b = boundsRef.current
        const rect = cvs.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        if (draggingRef.current.edge === 'pan') {
          draggingRef.current = null
          return
        }
        // convert pixel to world value with current scale/offset
        const invA = (px) => {
          const t = ((px - b.pad - offset.a) / (b.W - b.pad * 2)) / (scale || 1)
          return b.minA + t * (b.maxA - b.minA)
        }
        const invB = (py) => {
          const t = ((py - b.pad - offset.b) / (b.H - b.pad * 2)) / (scale || 1)
          return b.minB + t * (b.maxB - b.minB)
        }
        if (draggingRef.current.edge === 'left' || draggingRef.current.edge === 'right') {
          // adjust first axis single-sided: move the dragged edge only
          const worldX = invA(x)
          const halfOther = dims[sizeKeys[1]] / 2
          let minEdge = center[b.ax] - dims[sizeKeys[0]] / 2
          let maxEdge = center[b.ax] + dims[sizeKeys[0]] / 2
          if (draggingRef.current.edge === 'left') {
            minEdge = Math.min(worldX, maxEdge - 0.01)
          } else {
            maxEdge = Math.max(worldX, minEdge + 0.01)
          }
          const newSize = Math.max(0.01, maxEdge - minEdge)
          const newCenterA = (minEdge + maxEdge) / 2
          const nextCenter = { ...center, [b.ax]: newCenterA }
          setDims({ [sizeKeys[0]]: Number(newSize.toFixed(3)) }, nextCenter)
        } else {
          // adjust second axis single-sided
          const worldY = invB(y)
          let minEdge = center[b.ay] - dims[sizeKeys[1]] / 2
          let maxEdge = center[b.ay] + dims[sizeKeys[1]] / 2
          if (draggingRef.current.edge === 'top') {
            minEdge = Math.min(worldY, maxEdge - 0.01)
          } else {
            maxEdge = Math.max(worldY, minEdge + 0.01)
          }
          const newSize = Math.max(0.01, maxEdge - minEdge)
          const newCenterB = (minEdge + maxEdge) / 2
          const nextCenter = { ...center, [b.ay]: newCenterB }
          setDims({ [sizeKeys[1]]: Number(newSize.toFixed(3)) }, nextCenter)
        }
        draggingRef.current = null
      }
      const onWheel = (e) => {
        e.preventDefault()
        const step = e.deltaY > 0 ? 0.9 : 1.1
        setScale((s) => Math.max(0.2, Math.min(4, Number((s * step).toFixed(3)))))
      }
      const onMoveDrag = (e) => {
        if (!draggingRef.current) return
        if (draggingRef.current.edge === 'pan') {
          const dx = e.clientX - draggingRef.current.startX
          const dy = e.clientY - draggingRef.current.startY
          setOffset({ a: draggingRef.current.startOffset.a + dx, b: draggingRef.current.startOffset.b + dy })
          return
        }
        if (draggingRef.current.edge === 'move') {
          const b = boundsRef.current
          if (!b) return
          const dx = e.clientX - draggingRef.current.startX
          const dy = e.clientY - draggingRef.current.startY
          const worldDx = ((dx) / (b.W - b.pad * 2)) / (b.scale || 1) * (b.maxA - b.minA)
          const worldDy = ((dy) / (b.H - b.pad * 2)) / (b.scale || 1) * (b.maxB - b.minB)
          const halfA = dims[sizeKeys[0]] / 2
          const halfB = dims[sizeKeys[1]] / 2
          let nextA = draggingRef.current.startCenter[b.ax] + worldDx
          let nextB = draggingRef.current.startCenter[b.ay] + worldDy
          // clamp within current view extent so box stays visible
          nextA = Math.max(b.minA + halfA, Math.min(b.maxA - halfA, nextA))
          nextB = Math.max(b.minB + halfB, Math.min(b.maxB - halfB, nextB))
          const nextCenter = { ...center, [b.ax]: Number(nextA.toFixed(3)), [b.ay]: Number(nextB.toFixed(3)) }
          setDims({}, nextCenter)
        }
      }
      cvs.addEventListener('mousemove', onMove)
      cvs.addEventListener('mousedown', onDown)
      cvs.addEventListener('wheel', onWheel, { passive: false })
      cvs.addEventListener('contextmenu', (e) => e.preventDefault())
      window.addEventListener('mousemove', onMoveDrag)
      window.addEventListener('mouseup', onUp)
      return () => {
        cvs.removeEventListener('mousemove', onMove)
        cvs.removeEventListener('mousedown', onDown)
        cvs.removeEventListener('wheel', onWheel)
        cvs.removeEventListener('contextmenu', (e) => e.preventDefault())
        window.removeEventListener('mousemove', onMoveDrag)
        window.removeEventListener('mouseup', onUp)
      }
    }, [hoverEdge, center.x, center.y, center.z, dims.width, dims.length, dims.height])

    return (
      <div style={{ border: '1px solid #374151', borderRadius: 8, padding: 10, background: '#0b0b0b' }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: '#e5e7eb' }}>{title}</div>
        <canvas ref={canvasRef} width={260} height={160} style={{ background: '#111827', border: '1px solid #374151', borderRadius: 6 }} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{labelW}：</span>
            <input type="number" value={dims[sizeKeys[0]]} min={0.01} step={0.01} onChange={(e) => setDims({ [sizeKeys[0]]: Number(e.target.value) })} style={{ width: 80, padding: '6px 8px', border: '1px solid #374151', borderRadius: 6, background: '#0b0b0b', color: '#e5e7eb' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{labelH}：</span>
            <input type="number" value={dims[sizeKeys[1]]} min={0.01} step={0.01} onChange={(e) => setDims({ [sizeKeys[1]]: Number(e.target.value) })} style={{ width: 80, padding: '6px 8px', border: '1px solid #374151', borderRadius: 6, background: '#0b0b0b', color: '#e5e7eb' }} />
          </div>
        </div>
      </div>
    )
  }

  const ImagePanel = () => {
    const wrapRef = useRef(null)
    const [ppm, setPpm] = useState(50) // pixels per meter
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const draggingRef = useRef(null)
    useEffect(() => {
      const wrap = wrapRef.current
      if (!wrap) return
      const onWheel = (e) => {
        e.preventDefault()
        const step = e.deltaY > 0 ? 0.9 : 1.1
        setPpm((p) => Math.max(10, Math.min(400, Number((p * step).toFixed(2)))))
      }
      const onDown = (e) => {
        if (e.button !== 2) return
        e.preventDefault()
        draggingRef.current = { startX: e.clientX, startY: e.clientY, startPan: { ...pan } }
      }
      const onMove = (e) => {
        if (!draggingRef.current) return
        const dx = e.clientX - draggingRef.current.startX
        const dy = e.clientY - draggingRef.current.startY
        setPan({ x: draggingRef.current.startPan.x + dx, y: draggingRef.current.startPan.y + dy })
      }
      const onUp = () => { draggingRef.current = null }
      wrap.addEventListener('wheel', onWheel, { passive: false })
      wrap.addEventListener('mousedown', onDown)
      wrap.addEventListener('contextmenu', (e) => e.preventDefault())
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
      return () => {
        wrap.removeEventListener('wheel', onWheel)
        wrap.removeEventListener('mousedown', onDown)
        wrap.removeEventListener('contextmenu', (e) => e.preventDefault())
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
    }, [pan.x, pan.y])
    const rectW = dims.width * ppm
    const rectH = dims.length * ppm
    return (
      <div ref={wrapRef} style={{ border: '1px solid #374151', borderRadius: 8, padding: 10, background: '#0b0b0b' }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: '#e5e7eb' }}>图像投影</div>
        <div style={{ position: 'relative', width: 260, height: 160, background: '#111827', border: '1px solid #374151', borderRadius: 6, overflow: 'hidden' }}>
          {imageSrc ? (
            <img src={imageSrc} alt="tri-image" style={{ position: 'absolute', left: pan.x, top: pan.y, width: 'auto', height: '100%', userSelect: 'none' }} />
          ) : null}
          <div style={{ position: 'absolute', left: 130 - rectW / 2 + pan.x, top: 80 - rectH / 2 + pan.y, width: rectW, height: rectH, border: '2px solid #10b981', boxShadow: '0 0 0 1px rgba(16,185,129,0.2)' }} />
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>滚轮缩放、右键拖动平移</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, ...(style || {}) }}>
      <ImagePanel />
      {/* Top (俯视，XZ) */}
      <Panel title="俯视 XZ" proj={{ axes: ['x', 'z'] }} labelW="宽" labelH="长" sizeKeys={[ 'width', 'length' ]} />
      {/* Front (正视，XY) */}
      <Panel title="正视 XY" proj={{ axes: ['x', 'y'] }} labelW="宽" labelH="高" sizeKeys={[ 'width', 'height' ]} />
      {/* Side (侧视，YZ) */}
      <Panel title="侧视 YZ" proj={{ axes: ['z', 'y'] }} labelW="长" labelH="高" sizeKeys={[ 'length', 'height' ]} />
    </div>
  )
}