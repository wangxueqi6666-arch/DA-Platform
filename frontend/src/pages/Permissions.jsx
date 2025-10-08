import React, { useState } from 'react'

const tabs = ['用户管理', '角色管理', '用户权限管理', '项目权限', '角色权限']

export default function Permissions() {
  const [active, setActive] = useState('用户管理')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {tabs.map((t) => (
          <button key={t} onClick={() => setActive(t)} style={{ ...tabBtn, background: active === t ? '#2563eb' : '#e5e7eb', color: active === t ? '#fff' : '#111827' }}>{t}</button>
        ))}
      </div>
      <div style={panel}>
        <Section title={active} />
      </div>
    </div>
  )
}

function Section({ title }) {
  if (title === '用户管理') {
    return (
      <div>
        <div style={h}>用户列表</div>
        <table style={table}><thead><tr><th style={th}>用户名</th><th style={th}>角色</th></tr></thead><tbody><tr><td style={td}>alice</td><td style={td}>标注员</td></tr><tr><td style={td}>bob</td><td style={td}>审核员</td></tr></tbody></table>
      </div>
    )
  }
  if (title === '角色管理') {
    return (
      <div>
        <div style={h}>角色列表</div>
        <ul><li>标注员</li><li>审核员</li><li>验收员</li><li>管理员</li></ul>
      </div>
    )
  }
  return (
    <div>
      <div style={h}>{title}</div>
      <div style={{ color: '#6b7280' }}>占位内容：在此配置权限规则与范围</div>
    </div>
  )
}

const tabBtn = { padding: '8px 10px', border: 'none', borderRadius: 6, cursor: 'pointer' }
const panel = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }
const h = { fontWeight: 600, marginBottom: 8 }
const table = { width: '100%', borderCollapse: 'collapse' }
const th = { textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb', fontWeight: 600 }
const td = { padding: 10, borderBottom: '1px solid #f3f4f6' }