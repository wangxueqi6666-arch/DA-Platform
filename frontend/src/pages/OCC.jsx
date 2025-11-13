import React, { useState } from 'react'

export default function OCC() {
  const [mode, setMode] = useState('图片展示')
  const [results, setResults] = useState([
    { id: 'C1', type: '车辆', color: '红色' },
    { id: 'C2', type: '行人', color: '绿色' },
  ])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr 320px', gap: 12, height: 'calc(100vh - 120px)' }}>
      <div style={panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600 }}>对照显示区</div>
          <div>
            <button style={btn} onClick={() => setMode('图片展示')}>图片展示</button>
            <button style={btn} onClick={() => setMode('单帧点云展示')}>单帧点云展示</button>
          </div>
        </div>
        <div style={subBox}>{mode}（可左右拖动、双击放大、滚轮缩放）</div>
      </div>

      <div style={panel}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>点云显示区（主操作区）</div>
        <div style={cloudBox}>拼接大点云显示，支持多边形选中/去除、点集增删与属性赋值</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button style={btn}>多边形选择</button>
          <button style={btn}>仅显示选中</button>
          <button style={btn}>保存</button>
        </div>
      </div>

      <div style={panel}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>标注结果展示区</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {results.map((r) => (
            <li key={r.id} style={listItem}>
              <div style={{ fontWeight: 600 }}>{r.id}</div>
              <div style={{ color: '#6b7280', fontSize: 12 }}>类型：{r.type}｜颜色：{r.color}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const panel = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, overflow: 'auto' }
const subBox = { height: 300, border: '1px dashed #cbd5e1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', marginTop: 8 }
const cloudBox = { height: 420, border: '1px dashed #cbd5e1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }
const btn = { padding: '8px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', marginLeft: 6 }
const listItem = { border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, marginBottom: 8 }