import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [role, setRole] = useState('标注员')

  const onSubmit = (e) => {
    e.preventDefault()
    const payload = { username: username || 'guest', role }
    localStorage.setItem('da_user', JSON.stringify(payload))
    navigate('/')
  }

  return (
    <div style={container}>
      <div style={card}>
        <h2 style={title}>登录</h2>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={label}>用户名
            <input style={input} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="输入用户名" />
          </label>
          <label style={label}>角色
            <select style={input} value={role} onChange={(e) => setRole(e.target.value)}>
              <option>标注员</option>
              <option>审核员</option>
              <option>验收员</option>
              <option>管理员</option>
            </select>
          </label>
          <button type="submit" style={button}>登录</button>
        </form>
      </div>
    </div>
  )
}

const container = { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }
const card = { width: 360, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }
const title = { margin: 0, marginBottom: 12 }
const label = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }
const input = { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6 }
const button = { padding: '10px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }