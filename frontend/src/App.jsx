import React, { useEffect, useState } from 'react'
import { Link, Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import TaskBoard from './pages/TaskBoard'
import Annotator3D from './pages/Annotator3D'
import OCC from './pages/OCC'
import BEV from './pages/BEV'
import TrafficLight from './pages/TrafficLight'
import Stats from './pages/Stats'
import TruthQuery from './pages/TruthQuery'
import Permissions from './pages/Permissions'
import ProductionManage from './pages/ProductionManage'

function App() {
  const loadUser = () => {
    try {
      const raw = localStorage.getItem('da_user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }
  const location = useLocation()
  const [userInfo, setUserInfo] = useState(loadUser())
  useEffect(() => {
    setUserInfo(loadUser())
  }, [location])

  const roles = ['标注员', '审核员', '验收员', '管理员']
  const onRoleChange = (e) => {
    const role = e.target.value
    if (!userInfo) return
    const next = { ...userInfo, role }
    localStorage.setItem('da_user', JSON.stringify(next))
    setUserInfo(next)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f6f7f9' }}>
      <header style={{ background: '#111827', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontWeight: 700 }}>DA 标注平台</span>
          <nav style={{ display: 'flex', gap: 12 }}>
            <Link style={navLinkStyle} to="/">主页</Link>
            <Link style={navLinkStyle} to="/stats">数据统计</Link>
            <Link style={navLinkStyle} to="/truth">真值查询</Link>
            {userInfo?.role === '管理员' && (
              <>
                <Link style={navLinkStyle} to="/permissions">权限管理</Link>
              </>
            )}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {userInfo ? (
            <>
              <span>用户：{userInfo.username}</span>
              <select value={userInfo.role} onChange={onRoleChange} style={roleSelectStyle}>
                {roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </>
          ) : (
            <span>未登录</span>
          )}
          <Link style={{ ...navLinkStyle, border: '1px solid #fff', borderRadius: 6, padding: '4px 8px' }} to="/login">
            登录
          </Link>
        </div>
      </header>

      <main style={{ flex: 1, padding: 16 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/tasks" element={<TaskBoard />} />
          <Route path="/manage/:kind" element={<ProductionManage />} />
          <Route path="/annotate/3d" element={<Annotator3D />} />
          <Route path="/annotate/occ" element={<OCC />} />
          <Route path="/annotate/bev" element={<BEV />} />
          <Route path="/annotate/traffic" element={<TrafficLight />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/truth" element={<TruthQuery />} />
          <Route path="/permissions" element={<Permissions />} />
      </Routes>
      </main>
    </div>
  )
}

const navLinkStyle = {
  color: '#fff',
  textDecoration: 'none',
  padding: '4px 6px',
  borderRadius: 4,
}

const roleSelectStyle = {
  padding: '4px 6px',
  borderRadius: 4,
  border: '1px solid #fff',
  background: '#111827',
  color: '#fff',
}

export default App
