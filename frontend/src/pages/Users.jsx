import React, { useMemo, useState } from 'react'

const roles = ['标注员', '审核员', '验收员', '管理员']

export default function Users() {
  const [users, setUsers] = useState([
    { id: 'U1', username: 'alice', email: 'alice@example.com', role: '标注员', enabled: true },
    { id: 'U2', username: 'bob', email: 'bob@example.com', role: '审核员', enabled: true },
  ])
  const [form, setForm] = useState({ id: '', username: '', email: '', role: roles[0], enabled: true })
  const [editingId, setEditingId] = useState('')
  const isEditing = useMemo(() => Boolean(editingId), [editingId])

  const resetForm = () => setForm({ id: '', username: '', email: '', role: roles[0], enabled: true })
  const startEdit = (u) => { setEditingId(u.id); setForm(u) }
  const cancelEdit = () => { setEditingId(''); resetForm() }

  const submitForm = (e) => {
    e.preventDefault()
    if (!form.username || !form.email) return
    if (isEditing) {
      setUsers((list) => list.map((u) => (u.id === editingId ? { ...form } : u)))
      cancelEdit()
    } else {
      const id = 'U' + (users.length + 1)
      setUsers((list) => [...list, { ...form, id }])
      resetForm()
    }
  }

  const toggleEnabled = (id) => setUsers((list) => list.map((u) => (u.id === id ? { ...u, enabled: !u.enabled } : u)))
  const removeUser = (id) => setUsers((list) => list.filter((u) => u.id !== id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 600 }}>用户管理</div>

      <div style={panel}>
        <form onSubmit={submitForm} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: 8, alignItems: 'end' }}>
          <label style={label}>用户名
            <input style={input} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="如 alice" />
          </label>
          <label style={label}>邮箱
            <input style={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="如 alice@example.com" />
          </label>
          <label style={label}>角色
            <select style={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {roles.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label style={label}>状态
            <select style={input} value={form.enabled ? '启用' : '停用'} onChange={(e) => setForm({ ...form, enabled: e.target.value === '启用' })}>
              <option>启用</option>
              <option>停用</option>
            </select>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={primaryBtn}>{isEditing ? '保存修改' : '新增用户'}</button>
            {isEditing && <button type="button" style={btn} onClick={cancelEdit}>取消</button>}
          </div>
        </form>
      </div>

      <div style={panel}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
          <thead>
            <tr>
              {['用户名', '邮箱', '角色', '状态', '操作'].map((h) => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={td}>{u.username}</td>
                <td style={td}>{u.email}</td>
                <td style={td}>{u.role}</td>
                <td style={td}>{u.enabled ? '启用' : '停用'}</td>
                <td style={td}>
                  <button style={btn} onClick={() => startEdit(u)}>编辑</button>
                  <button style={btn} onClick={() => toggleEnabled(u.id)}>{u.enabled ? '停用' : '启用'}</button>
                  <button style={dangerBtn} onClick={() => removeUser(u.id)}>删除</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td style={{ ...td, textAlign: 'center' }} colSpan={5}>暂无用户</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const panel = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }
const label = { display: 'flex', flexDirection: 'column', fontSize: 12, color: '#6b7280' }
const input = { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6 }
const primaryBtn = { padding: '10px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }
const btn = { padding: '8px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', marginLeft: 8 }
const dangerBtn = { padding: '8px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', marginLeft: 8 }
const th = { textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb', fontWeight: 600 }
const td = { padding: 10, borderBottom: '1px solid #f3f4f6' }
