import React from 'react'
import BoxTriView from './BoxTriView'

export default function FramesGridView({ images = [], box, focusedId, onBack }) {
  const header = (
    <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 0', background: '#0b0b0b', borderBottom: '1px solid #1f2937', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 600 }}>网格视图（从上往下显示所有帧）</div>
        <div style={{ color: '#9ca3af' }}>对象：{focusedId || '未选择'}</div>
        <div style={{ color: '#9ca3af' }}>帧数：{images.length}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button style={backBtn} onClick={onBack}>返回主视图</button>
      </div>
    </div>
  )

  return (
    <div style={{ height: '100%', overflow: 'auto', paddingRight: 4 }}>
      {header}
      {images.length === 0 ? (
        <div style={{ ...rowWrap, justifyContent: 'center', alignItems: 'center', color: '#9ca3af' }}>未检测到图像帧</div>
      ) : (
        images.map((img, idx) => (
          <div key={`frame-row-${idx}`} style={rowWrap}>
            <div style={{ width: 120, paddingRight: 12 }}>
              <div style={{ fontWeight: 600, color: '#e5e7eb' }}>帧 {idx + 1}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>对象：{focusedId || '未选择'}</div>
            </div>
            <div style={{ flex: 1 }}>
              <BoxTriView box={box} points={null} imageSrc={img} style={{ background: '#0b0b0b' }} />
            </div>
          </div>
        ))
      )}
    </div>
  )
}

const rowWrap = { display: 'flex', gap: 12, border: '1px solid #1f2937', borderRadius: 10, padding: 12, marginBottom: 12, background: '#0b0b0b' }
const backBtn = { padding: '8px 10px', background: '#111827', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 6, cursor: 'pointer' }

