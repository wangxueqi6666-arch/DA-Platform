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
    const roleOptions = ['标注员', '审核员', '验收员', '管理员']
    const groupOptions = ['生产一组', '生产二组', '生产三组']
    const projectOptions = ['标注项目A', '质检项目B', '验收项目C']

    const [users, setUsers] = useState([
      { username: 'alice', email: 'alice@example.com', group: '生产一组', roles: ['标注员'], enabled: true, projects: ['标注项目A'] },
      { username: 'bob', email: 'bob@example.com', group: '生产二组', roles: ['审核员'], enabled: true, projects: ['质检项目B'] },
    ])

    const [showAdd, setShowAdd] = useState(false)
    const [editIndex, setEditIndex] = useState(null)
    const [form, setForm] = useState({ username: '', email: '', password: '', group: groupOptions[0], roles: [], projects: [] })

    const openAdd = () => { setForm({ username: '', email: '', password: '', group: groupOptions[0], roles: [], projects: [] }); setShowAdd(true) }
    const saveAdd = () => {
      if (!form.username || !form.email || !form.password) return alert('请填写必填项：用户名/邮箱/密码')
      setUsers((prev) => [...prev, { username: form.username, email: form.email, group: form.group, roles: [...form.roles], enabled: true, projects: [...form.projects] }])
      setShowAdd(false)
    }
    const openEdit = (idx) => {
      const u = users[idx]
      setForm({ username: u.username, email: u.email, password: '', group: u.group, roles: [...u.roles], projects: [...(u.projects || [])] })
      setEditIndex(idx)
    }
    const saveEdit = () => {
      if (editIndex == null) return
      setUsers((prev) => {
        const next = [...prev]
        next[editIndex] = { ...next[editIndex], username: form.username, email: form.email, group: form.group, roles: [...form.roles], projects: [...form.projects] }
        return next
      })
      setEditIndex(null)
    }
    const toggleEnabled = (idx, val) => {
      setUsers((prev) => {
        const next = [...prev]
        next[idx] = { ...next[idx], enabled: val }
        return next
      })
    }
    const onMultiSelect = (e, field) => {
      const values = Array.from(e.target.selectedOptions).map((o) => o.value)
      setForm((f) => ({ ...f, [field]: values }))
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 顶部“用户管理页”标题去掉，仅保留操作条 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button style={primaryBtn} onClick={openAdd}>新增</button>
        </div>

        <table style={table}>
          <thead>
            <tr>
              <th style={th}>用户名</th>
              <th style={th}>邮箱</th>
              <th style={th}>生产组</th>
              <th style={th}>角色</th>
              <th style={th}>状态</th>
              <th style={th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, idx) => (
              <tr key={u.username}>
                <td style={td}>{u.username}</td>
                <td style={td}>{u.email}</td>
                <td style={td}>{u.group}</td>
                <td style={td}>{u.roles.join('、')}</td>
                <td style={td}>{u.enabled ? '激活' : '禁用'}</td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={btn} onClick={() => toggleEnabled(idx, false)}>禁用</button>
                    <button style={btn} onClick={() => toggleEnabled(idx, true)}>激活</button>
                    <button style={btn} onClick={() => openEdit(idx)}>编辑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(showAdd || editIndex != null) && (
          <div style={overlay}>
            <div style={modal}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{showAdd ? '新增用户' : '编辑用户'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={label}>用户名
                  <input style={input} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
                </label>
                <label style={label}>邮箱
                  <input style={input} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </label>
                <label style={label}>密码
                  <input style={input} type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={showAdd ? '' : '不修改请留空'} />
                </label>
                <label style={label}>生产组
                  <select style={input} value={form.group} onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}>
                    {groupOptions.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </label>
                <label style={label}>角色（多选）
                  <select style={input} multiple value={form.roles} onChange={(e) => onMultiSelect(e, 'roles')}>
                    {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                {!showAdd && (
                  <label style={label}>可执行的项目（多选）
                    <select style={input} multiple value={form.projects} onChange={(e) => onMultiSelect(e, 'projects')}>
                      {projectOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button style={btn} onClick={() => { setShowAdd(false); setEditIndex(null) }}>取消</button>
                <button style={primaryBtn} onClick={showAdd ? saveAdd : saveEdit}>保存</button>
              </div>
            </div>
          </div>
        )}
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
const btn = { padding: '6px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', background: '#e5e7eb' }
const primaryBtn = { ...btn, background: '#2563eb', color: '#fff' }
const input = { padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, width: '100%' }
const label = { display: 'flex', flexDirection: 'column', gap: 6 }
const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }
const modal = { background: '#fff', padding: 16, borderRadius: 8, width: 520, maxWidth: '90vw', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }
