import React, { useState } from 'react'

export default function Annotator3D() {
  const [targets, setTargets] = useState([
    { id: 'T1', type: '车辆', group: false, ghost: false },
    { id: 'T2', type: '行人', group: false, ghost: false },
  ])
  const [focused, setFocused] = useState(null)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 320px', gap: 12, height: 'calc(100vh - 120px)' }}>
      <div style={panel}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>11V 图像</div>
        <div style={imageBox}>双击图片可放大显示；滚轮缩放</div>
      </div>

      <div style={panel}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>点云区域（主操作区）</div>
        <div style={cloudBox}>在此进行3D拉框、调整尺寸、移动坐标、设置roll/yaw/pitch等</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button style={btn}>拉框</button>
          <button style={btn}>调整尺寸</button>
          <button style={btn}>保存</button>
          <button style={btn}>提交到审核员</button>
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
  )
}

const panel = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, overflow: 'auto' }
const imageBox = { height: '100%', minHeight: 240, border: '1px dashed #cbd5e1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }
const cloudBox = { height: 420, border: '1px dashed #cbd5e1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }
const btn = { padding: '8px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }
const listItem = { border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, marginBottom: 8, cursor: 'pointer' }