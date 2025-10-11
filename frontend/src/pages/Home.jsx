import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  const userRole = (() => {
    try {
      const raw = localStorage.getItem('da_user')
      return raw ? JSON.parse(raw).role : '标注员'
    } catch {
      return '标注员'
    }
  })()
  const isAdmin = userRole === '管理员'

  const sections = [
    {
      title: '标注管理',
      items: [
        { title: '任务看板', desc: '查看并领取任务，按状态管理', path: '/tasks' },
        { title: '数据统计', desc: '生产与运营数据统计', path: '/stats' },
      ],
    },
    {
      title: '数据生产',
      items: [
        { title: '23D目标物', desc: '进入该类型的任务管理页', path: '/manage/3d' },
        { title: 'OCC', desc: '进入该类型的任务管理页', path: '/manage/occ' },
        { title: 'BEV路面元素标注', desc: '进入该类型的任务管理页', path: '/manage/bev' },
        { title: '红绿灯标注', desc: '进入该类型的任务管理页', path: '/manage/traffic' },
      ],
    },
    {
      title: '真值查询',
      items: [
        { title: '真值查询', desc: '基于任务与人员信息检索', path: '/truth' },
      ],
    },
    {
      title: '系统管理',
      items: [
        { title: '权限管理', desc: '用户、角色与权限配置', path: '/permissions' },
      ],
    },
  ]

  const visibleSections = sections
    .map((sec) => {
      if (sec.title === '系统管理' && !isAdmin) {
        return { ...sec, items: [] }
      }
      return sec
    })
    .filter((sec) => sec.items.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {visibleSections.map((sec) => (
        <section key={sec.title}>
          <h3 style={{ margin: 0, marginBottom: 12 }}>{sec.title}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {sec.items.map((c) => (
              <div key={c.title} style={card} onClick={() => navigate(c.path)}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{c.title}</div>
                <div style={{ color: '#6b7280', fontSize: 14 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, cursor: 'pointer' }
