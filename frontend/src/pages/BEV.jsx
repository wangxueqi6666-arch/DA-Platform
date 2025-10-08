import React, { useState } from 'react'

export default function BEV() {
  const [elements, setElements] = useState([
    { id: 'E1', type: '车道线', color: '白色', width: 0.15 },
    { id: 'E2', type: '人行横道', color: '白色', width: 3.0 },
  ])
  const [focused, setFocused] = useState(null)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 320px', gap: 12, height: 'calc(100vh - 120px)' }}>
      <div style={panel}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>参考视图</div>
        <div style={subBox}>可显示BEV参考图或示例车道线/箭头等</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button style={btn}>切换底图</button>
          <button style={btn}>显示网格</button>
        </div>
      </div>

      <div style={panel}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>BEV标注主区</div>
        <div style={bevBox}>在俯视图中进行多边形/线段/矩形标注，支持缩放与拖拽</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button style={btn}>绘制线段</button>
          <button style={btn}>绘制多边形</button>
          <button style={btn}>保存</button>
          <button style={btn}>提交到审核员</button>
        </div>
      </div>

      <div style={panel}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>元素属性</div>
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