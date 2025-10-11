import React, { useEffect, useRef, useState } from 'react'
import { getDatasetFrames, API_BASE } from '../api/client'
import PointCloudViewer from '../components/PointCloudViewer'
import BoxTriView from '../components/BoxTriView'
import FramesGridView from '../components/FramesGridView'

export default function Annotator3D() {
  const containerRef = useRef(null)
  const popupRef = useRef(null)
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
  const [attrPopup, setAttrPopup] = useState({ visible: false, type: '小车', forId: null })
  const showHighlight = !!focused || attrPopup.visible

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
  const [actionNotice, setActionNotice] = useState(null)
  const [box, setBox] = useState(null)
  const [points, setPoints] = useState([])
  const [viewMode, setViewMode] = useState('main') // 'main' | 'grid'

  // 页面暗色主题：设置整个页面背景为黑色以降低视觉疲劳
  useEffect(() => {
    const prevBg = document.body.style.backgroundColor
    const prevColor = document.body.style.color
    document.body.style.backgroundColor = '#000'
    document.body.style.color = '#e5e7eb'
    return () => {
      document.body.style.backgroundColor = prevBg
      document.body.style.color = prevColor
    }
  }, [])

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

  // 依据框体尺寸给出默认类型
  const guessType = (b) => {
    if (!b) return '小车'
    const { width = 0, length = 0, height = 0 } = b
    if ((length > 6 && width > 2) || height > 3) return '卡车'
    if (height > 1.3 && height < 2.2 && width < 0.8 && length < 0.9) return '行人'
    if (height >= 0.6 && height <= 1.0 && width <= 0.5 && length <= 0.5) return '雪糕筒'
    if (length >= 1.5 && length <= 2.5 && height >= 1.0 && height <= 1.8 && width <= 0.9) return '二轮车'
    return '小车'
  }

  // 主区：拉框完成后弹出属性选择
  const onBoxDrawn = (b) => {
    setBox({ width: b.width, length: b.length, height: b.height, center: { x: b.center.x, y: b.center.y, z: b.center.z } })
    const defType = guessType(b)
    setAttrPopup({ visible: true, type: defType, forId: null })
  }

  // Z 快捷键：唤起当前聚焦目标的属性面板
  useEffect(() => {
    const onKey = (e) => {
      const key = e.key.toLowerCase()
      if (key === 'z' && focused) {
        const t = targets.find((x) => x.id === focused)
        const typ = t?.type || '小车'
        setAttrPopup({ visible: true, type: typ, forId: focused })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focused, targets])

  // 外部点击关闭属性弹窗
  useEffect(() => {
    if (!attrPopup.visible) return
    const onDown = (e) => {
      if (!popupRef.current) return
      if (!popupRef.current.contains(e.target)) {
        setAttrPopup((p) => ({ ...p, visible: false }))
      }
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [attrPopup.visible])

  // 同步：当 box 改变且存在聚焦目标时，更新其尺寸
  useEffect(() => {
    if (!focused || !box) return
    setTargets((prev) => prev.map((x) => x.id === focused ? { ...x, box } : x))
  }, [box, focused])

  const onSave = () => {
    setActionNotice('已保存更改')
    setTimeout(() => setActionNotice(null), 2200)
  }
  const onSubmit = () => {
    setActionNotice('已提交到审核员')
    setTimeout(() => setActionNotice(null), 2200)
  }

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
        <button onClick={toggleLeft} style={{ position: 'absolute', top: 8, left: 8, padding: '4px 8px', border: '1px solid #374151', borderRadius: 6, background: '#111827', color: '#e5e7eb', cursor: 'pointer' }}>{leftCollapsed ? '显示' : '隐藏'}</button>
        {!leftCollapsed && (
          <div>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>11V 图像</div>
            <div style={{ marginBottom: 8, fontSize: 12, color: '#9ca3af' }}>
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
                            border: '1px solid #374151',
                            borderRadius: 6,
                            overflow: 'visible',
                            height: 140,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#0f172a',
                            position: 'relative',
                            zIndex: z,
                            boxShadow: isTop || isHover || isZoomed ? '0 4px 12px rgba(0,0,0,0.35)' : 'none',
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
      <div onMouseDown={onDividerMouseDown} style={{ cursor: 'col-resize', background: '#1f2937', borderRadius: 4 }} />

      {/* 中间主操作区（默认撑到底部），保存/提交置于右上角，工具栏吸顶 */}
      <div style={{ ...panel, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* 顶部工具栏：左侧为信息与选择，右侧为保存/提交（吸顶） */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 0', background: '#0b0b0b', borderBottom: '1px solid #1f2937', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 600 }}>点云区域（主操作区）</div>
            <div style={{ color: '#9ca3af' }}>当前帧：{currentFrame + 1}/{totalFrames}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>点云文件：</span>
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
                style={{ padding: '6px 8px', border: '1px solid #374151', borderRadius: 8, background: '#111827', color: '#e5e7eb' }}
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
            <div>
              <button style={{ ...btn, background: '#111827', color: '#e5e7eb', border: '1px solid #374151' }} onClick={() => setViewMode((m) => m === 'main' ? 'grid' : 'main')}>
                {viewMode === 'main' ? '切换为网格视图' : '返回主视图'}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {actionNotice && (
              <span style={{ fontSize: 12, color: '#d1fae5', background: '#064e3b', border: '1px solid #065f46', padding: '4px 8px', borderRadius: 16 }}>{actionNotice}</span>
            )}
            <button style={btn} onClick={onSave}>保存</button>
            <button style={btn} onClick={onSubmit}>提交到审核员</button>
          </div>
        </div>

        {/* 主体点云显示区或网格视图填充剩余空间 */}
        {viewMode === 'main' ? (
          pointclouds.length > 0 ? (
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <PointCloudViewer
                src={pointclouds[0]}
                style={{ height: '100%' }}
                box={box}
                onBoxChange={(b) => setBox({ width: b.width, length: b.length, height: b.height, center: { x: b.center.x, y: b.center.y, z: b.center.z } })}
                onPointsLoaded={setPoints}
                highlight={showHighlight}
                onBoxDrawn={onBoxDrawn}
                annotations={targets}
                onSelectAnnotation={(id) => {
                  const t = targets.find((x) => x.id === id)
                  if (t?.box) setBox(t.box)
                  setFocused(id)
                }}
              />
              {attrPopup.visible && (
                <div ref={popupRef} style={{ position: 'absolute', right: 12, top: 12, background: '#0b0b0b', border: '1px solid #1f2937', borderRadius: 10, boxShadow: '0 10px 24px rgba(0,0,0,0.45)', padding: 12, zIndex: 30, minWidth: 260 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, color: '#e5e7eb' }}>属性选择</div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#e5e7eb' }}>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>类型</span>
                    <select value={attrPopup.type} onChange={(e) => setAttrPopup((p) => ({ ...p, type: e.target.value }))} style={{ padding: '6px 8px', border: '1px solid #374151', borderRadius: 8, background: '#111827', color: '#e5e7eb' }}>
                      {['小车','卡车','行人','雪糕筒','二轮车'].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={btn} onClick={() => {
                      if (attrPopup.forId) {
                        setTargets((prev) => prev.map((x) => x.id === attrPopup.forId ? { ...x, type: attrPopup.type, box } : x))
                        setAttrPopup({ visible: false, type: '小车', forId: null })
                        setActionNotice('已更新属性'); setTimeout(() => setActionNotice(null), 1600)
                      } else {
                        const nid = `T${targets.length + 1}`
                        const item = { id: nid, type: attrPopup.type, group: false, ghost: false, box }
                        setTargets((prev) => [...prev, item])
                        setFocused(nid)
                        setAttrPopup({ visible: false, type: '小车', forId: null })
                        setActionNotice('已新增标注'); setTimeout(() => setActionNotice(null), 1600)
                      }
                    }}>保存</button>
                    <button style={{ ...btn, background: '#111827', color: '#e5e7eb', border: '1px solid #374151' }} onClick={() => setAttrPopup({ visible: false, type: '小车', forId: null })}>取消</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ ...cloudBox, flex: 1 }}>未检测到点云文件（支持 .pcd / .ply）</div>
          )
        ) : (
          <div style={{ flex: 1, minHeight: 0 }}>
            <FramesGridView
              images={images}
              box={focused ? (targets.find((x) => x.id === focused)?.box || box) : box}
              focusedId={focused}
              onBack={() => setViewMode('main')}
            />
          </div>
        )}

        {/* 三视图模块：仅在主视图模式下显示 */}
        {viewMode === 'main' && (
          <div style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>三视图（调整 3D 框尺寸）</div>
            <BoxTriView
              box={box}
              points={points}
              imageSrc={images[0] || null}
              onChange={(dims) => setBox((prev) => {
                const nextCenter = dims.center || prev?.center || { x: 0, y: (dims.height || 1) / 2, z: 0 }
                const { center: _omitCenter, ...pureDims } = dims
                const updated = { ...prev, ...pureDims, center: nextCenter }
                if (focused) {
                  setTargets((prevT) => prevT.map((x) => x.id === focused ? { ...x, box: updated } : x))
                }
                return updated
              })}
              style={{ background: '#0b0b0b' }}
            />
          </div>
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
            <li key={t.id} style={{ ...listItem, background: focused === t.id ? '#0c4a6e' : '#0b0b0b', color: '#e5e7eb' }} onClick={() => { setFocused(t.id); if (t.box) setBox(t.box) }}>
              <div style={{ fontWeight: 600 }}>{t.id}</div>
              <div style={{ color: '#9ca3af', fontSize: 12 }}>类型：{t.type}｜群体：{t.group ? '是' : '否'}｜重影：{t.ghost ? '是' : '否'}</div>
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

const panel = { background: '#0b0b0b', border: '1px solid #1f2937', borderRadius: 8, padding: 12, overflow: 'auto' }
const cloudBox = { height: 420, border: '1px dashed #374151', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }
const btn = { padding: '8px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }
const listItem = { border: '1px solid #1f2937', borderRadius: 8, padding: 10, marginBottom: 8, cursor: 'pointer' }
const frameBar = { position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 1200, background: '#0b0b0b', border: '1px solid #1f2937', borderRadius: 12, boxShadow: '0 8px 20px rgba(0,0,0,0.35)', padding: 10, display: 'flex', alignItems: 'center', gap: 8 }
const framesScroller = { display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', padding: '2px 4px' }
const frameBtn = { minWidth: 36, padding: '6px 8px', border: '1px solid #374151', borderRadius: 8, cursor: 'pointer' }
const navBtn = { padding: '6px 10px', border: '1px solid #374151', background: '#111827', color: '#e5e7eb', borderRadius: 8, cursor: 'pointer' }
