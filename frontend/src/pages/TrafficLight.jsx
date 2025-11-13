import React, { useState } from 'react'

export default function TrafficLight() {
  const [lights, setLights] = useState([
    { id: 'L1', type: '三灯', state: '红', blinking: false, position: { x: 12.4, y: -3.1 } },
    { id: 'L2', type: '三灯', state: '绿', blinking: false, position: { x: 30.2, y: 4.8 } },
  ])
  const [focused, setFocused] = useState(null)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 320px', gap: 12, height: 'calc(100vh - 120px)' }}>
      <div style={panel}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>参考图像</div>
        <div style={subBox}>可显示路口图像缩略图；鼠标滚轮缩放，双击放大</div>
      </div>

      <div style={panel}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>交通灯标注主区</div>
        <div style={bevBox}>在俯视/投影视图中点选交通灯位置并设置状态（红/黄/绿/闪烁）</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button style={btn}>点选添加</button>
          <button style={btn}>编辑属性</button>
          <button style={btn}>保存</button>
          <button style={btn}>提交到审核员</button>
        </div>
      </div>

      <div style={panel}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>交通灯列表</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {lights.map((l) => (
            <li key={l.id} style={{ ...listItem, background: focused === l.id ? '#e0f2fe' : '#fff' }} onClick={() => setFocused(l.id)}>
              <div style={{ fontWeight: 600 }}>{l.id}</div>
              <div style={{ color: '#6b7280', fontSize: 12 }}>类型：{l.type}｜状态：{l.state}{l.blinking ? '（闪烁）' : ''}｜位置：({l.position.x}, {l.position.y})</div>
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