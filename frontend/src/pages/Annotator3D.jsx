import React, { useEffect, useRef, useState } from 'react'
import { getDatasetFrames, API_BASE } from '../api/client'
import PointCloudViewer from '../components/PointCloudViewer'

export default function Annotator3D() {
  const containerRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [leftWidth, setLeftWidth] = useState(280)
  const totalFrames = 60
  const [currentFrame, setCurrentFrame] = useState(0)
  const [targets, setTargets] = useState([
    { id: 'T1', type: '车辆', group: false, ghost: false },
    { id: 'T2', type: '行人', group: false, ghost: false },
  ])
  const [focused, setFocused] = useState(null)

  // 数据集加载状态 & 图像/点云列表
  const [images, setImages] = useState([])
  const [pointclouds, setPointclouds] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadErr, setLoadErr] = useState(null)
  const [zoomScales, setZoomScales] = useState(Array.from({ length: 11 }, () => 1))
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const [topIdx, setTopIdx] = useState(null)
  const [offsets, setOffsets] = useState(Array.from({ length: 11 }, () => ({ x: 0, y: 0 })))
  const [dragIdx, setDragIdx] = useState(null)
  const dragRef = useRef({ startX: 0, startY: 0, origX: 0, origY: 0 })

  // 加载后端数据集帧列表，并提取图像 URL（前11张）
  useEffect(() => {
    let mounted = true
    setLoading(true)
    getDatasetFrames()
      .then((data) => {
        if (!data?.ok) throw new Error(data?.message || '加载数据集失败')
        const frames = data.frames || []
        const imgs = frames.filter((f) => f.type === 'image').map((f) => `${API_BASE}${f.url}`)
        const pcs = frames.filter((f) => f.type === 'pointcloud').map((f) => `${API_BASE}${f.url}`)
        if (!mounted) return
        setImages(imgs)
        setPointclouds(pcs)
        setLoadErr(null)
      })
      .catch((e) => {
        if (!mounted) return
        setLoadErr(e?.message || String(e))
      })
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  // 根据当前显示的图像数量重置缩放与偏移数组长度
  const displayImgs = images.length ? images.slice(0, 11) : Array.from({ length: 11 }, () => '/vite.svg')
  useEffect(() => {
    setZoomScales(Array.from({ length: displayImgs.length }, () => 1))
    setOffsets(Array.from({ length: displayImgs.length }, () => ({ x: 0, y: 0 })))
    setHoveredIdx(null)
    setTopIdx(null)
  }, [images.length])

  // 拖拽分隔栏事件
  const onDividerMouseDown = (e) => {
    e.preventDefault(); setDragging(true)
  }
  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const minLeft = 160 // 左侧最小宽度
      const rightFixed = 320 // 右侧属性栏固定宽度
      const dividerW = 8
      const maxLeft = Math.max(minLeft, rect.width - rightFixed - dividerW - 160) // 保证主区最小160
      let next = e.clientX - rect.left
      next = Math.max(minLeft, Math.min(maxLeft, next))
      setLeftWidth(next)
      setLeftCollapsed(false)
    }
    const onUp = () => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging])

  const toggleLeft = () => setLeftCollapsed((v) => !v)
  const onImgWheel = (idx) => (e) => {
    e.preventDefault()
    const step = e.deltaY > 0 ? -0.1 : 0.1
    setZoomScales((prev) => {
      const next = [...prev]
      const val = Math.max(0.5, Math.min(4, Number((prev[idx] + step).toFixed(2))))
      next[idx] = val
      return next
    })
  }

  // 帧切换
  const goPrev = () => setCurrentFrame((f) => Math.max(0, f - 1))
  const goNext = () => setCurrentFrame((f) => Math.min(totalFrames - 1, f + 1))
  const setFrame = (idx) => setCurrentFrame(idx)

  // 拖拽（左键按住）移动单个图片位置
  useEffect(() => {
    if (dragIdx == null) return
    const onMove = (e) => {
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      setOffsets((prev) => {
        const next = [...prev]
        next[dragIdx] = {
          x: dragRef.current.origX + dx,
          y: dragRef.current.origY + dy,
        }
        return next
      })
    }
    const onUp = () => setDragIdx(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragIdx])

  return (
    <>
    <div ref={containerRef} style={{ display: 'grid', gridTemplateColumns: `${leftCollapsed ? '0px' : leftWidth + 'px'} 8px 1fr 320px`, gap: 12, height: 'calc(100vh - 120px)' }}>
      {/* 左侧 11V 图像区域 */}
      <div style={{ ...panel, position: 'relative', overflow: leftCollapsed ? 'hidden' : 'auto' }}>
        {/* 隐藏/显示按钮（左上角） */}
        <button onClick={toggleLeft} style={{ position: 'absolute', top: 8, left: 8, padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>{leftCollapsed ? '显示' : '隐藏'}</button>
        {!leftCollapsed && (
          <div>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>11V 图像</div>
            <div style={{ marginBottom: 8, fontSize: 12, color: '#6b7280' }}>
              {loading ? '正在从后端加载数据集…' : loadErr ? `加载失败：${loadErr}` : images.length ? `已加载 ${images.length} 张图像（显示前11张）` : '未检测到图像，显示占位'}
            </div>
            {/* 顶部图像部件：第一排2张，下面三排每排3张 */}
            {(() => {
              const layout = [2, 3, 3, 3]
              let offset = 0
              let gIndex = 0
              return layout.map((cols, ri) => {
                const items = displayImgs.slice(offset, offset + cols)
                offset += cols
                return (
                  <div key={`row-${ri}`} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8, marginBottom: 8 }}>
                    {items.map((src, ci) => {
                      const idx = gIndex++
                      const isTop = topIdx === idx
                      const isHover = hoveredIdx === idx
                      const isZoomed = zoomScales[idx] > 1
                      const isDragging = dragIdx === idx
                      const z = isTop ? 1000 : (isDragging || isHover || isZoomed ? 500 : 1)
                      const { x, y } = offsets[idx]
                      return (
                        <div
                          key={`img-${idx}`}
                          onDoubleClick={(e) => e.currentTarget.requestFullscreen?.()}
                          onWheel={onImgWheel(idx)}
                          onMouseEnter={() => setHoveredIdx(idx)}
                          onMouseLeave={() => setHoveredIdx((v) => (v === idx ? null : v))}
                          onMouseDown={(e) => {
                            setTopIdx(idx)
                            setDragIdx(idx)
                            dragRef.current = { startX: e.clientX, startY: e.clientY, origX: x, origY: y }
                            e.preventDefault()
                          }}
                          onClick={() => setTopIdx(idx)}
                          style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: 6,
                            overflow: 'visible',
                            height: 140,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f9fafb',
                            position: 'relative',
                            zIndex: z,
                            boxShadow: isTop || isHover || isZoomed ? '0 4px 12px rgba(0,0,0,0.12)' : 'none',
                            cursor: isDragging ? 'grabbing' : 'grab',
                          }}
                        >
                          <img
                            src={src}
                            alt={`preview-${idx}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              transform: `translate(${x}px, ${y}px) scale(${zoomScales[idx]})`,
                              transformOrigin: 'center center',
                              transition: 'transform 60ms linear',
                              willChange: 'transform',
                              userSelect: 'none',
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                )
              })
            })()}
            
          </div>
        )}
      </div>

      {/* 可拖拽分隔栏 */}
      <div onMouseDown={onDividerMouseDown} style={{ cursor: 'col-resize', background: '#e5e7eb', borderRadius: 4 }} />

      {/* 中间主操作区（默认撑到底部），保存/提交置于右上角 */}
      <div style={{ ...panel, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* 顶部工具栏：左侧为信息与选择，右侧为保存/提交 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 600 }}>点云区域（主操作区）</div>
            <div style={{ color: '#6b7280' }}>当前帧：{currentFrame + 1}/{totalFrames}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>点云文件：</span>
              <select
                value={pointclouds[0] || ''}
                onChange={(e) => setPointclouds((prev) => {
                  const next = [...prev]
                  const idx = next.indexOf(e.target.value)
                  if (idx > -1) {
                    next.splice(idx, 1)
                    next.unshift(e.target.value)
                  }
                  return next
                })}
                style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 8 }}
              >
                {pointclouds.length === 0 ? (
                  <option value="">未检测到点云</option>
                ) : (
                  pointclouds.map((p) => (
                    <option key={p} value={p}>{p.replace(`${API_BASE}/dataset/`, '')}</option>
                  ))
                )}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btn}>保存</button>
            <button style={btn}>提交到审核员</button>
          </div>
        </div>

        {/* 主体点云显示区填充剩余空间 */}
        {pointclouds.length > 0 ? (
          <div style={{ flex: 1, minHeight: 0 }}>
            <PointCloudViewer src={pointclouds[0]} style={{ height: '100%' }} />
          </div>
        ) : (
          <div style={{ ...cloudBox, flex: 1 }}>未检测到点云文件（支持 .pcd / .ply）</div>
        )}

        {/* 其他操作按钮保留在底部以不影响主区面积 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button style={btn}>拉框</button>
          <button style={btn}>调整尺寸</button>
        </div>
      </div>

      <div style={panel}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>属性栏</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {targets.map((t) => (
            <li key={t.id} style={{ ...listItem, background: focused === t.id ? '#e0f2fe' : '#fff' }} onClick={() => setFocused(t.id)}>
              <div style={{ fontWeight: 600 }}>{t.id}</div>
              <div style={{ color: '#6b7280', fontSize: 12 }}>类型：{t.type}｜群体：{t.group ? '是' : '否'}｜重影：{t.ghost ? '是' : '否'}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>

    {/* 帧数选择栏（底部固定） */}
    <div style={frameBar}>
      <button onClick={goPrev} style={navBtn} disabled={currentFrame === 0}>上一帧</button>
      <div style={framesScroller}>
        {Array.from({ length: totalFrames }, (_, i) => (
          <button
            key={`frame-${i}`}
            onClick={() => setFrame(i)}
            style={{
              ...frameBtn,
              background: i === currentFrame ? '#2563eb' : '#f8fafc',
              color: i === currentFrame ? '#fff' : '#111827',
              borderColor: i === currentFrame ? '#2563eb' : '#e5e7eb',
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <button onClick={goNext} style={navBtn} disabled={currentFrame === totalFrames - 1}>下一帧</button>
    </div>
    </>
  )
}

const panel = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, overflow: 'auto' }
const cloudBox = { height: 420, border: '1px dashed #cbd5e1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }
const btn = { padding: '8px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }
const listItem = { border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, marginBottom: 8, cursor: 'pointer' }
const frameBar = { position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 1200, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 20px rgba(0,0,0,0.08)', padding: 10, display: 'flex', alignItems: 'center', gap: 8 }
const framesScroller = { display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', padding: '2px 4px' }
const frameBtn = { minWidth: 36, padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' }
const navBtn = { padding: '6px 10px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, cursor: 'pointer' }