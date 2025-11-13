import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchTasks, claimTasks, submitTask, reviewTask, acceptTask, returnTask } from '../api/tasks'

// 角色可参与的状态（仅展示已领取与被驳回的状态）
function roleTabsFor(role) {
  if (role === '标注员') return ['标注中', '驳回标注']
  if (role === '审核员') return ['审核中', '驳回审核']
  if (role === '验收员') return ['验收中']
  if (role === '管理员') return ['标注中', '驳回标注', '审核中', '驳回审核', '验收中']
  return ['标注中', '驳回标注']
}
const dataTypes = ['新标注数据', '预标注任务', '重标注任务']

const routeForKind = (kind) => {
  switch (kind) {
    case '3d': return '/annotate/3d'
    case 'occ': return '/annotate/occ'
    case 'bev': return '/annotate/bev'
    case 'traffic': return '/annotate/traffic'
    default: return '/'
  }
}

// 示例任务按新状态覆盖
const sample = [
  { id: 'P-3001', kind: '3d', clip: 'clip_1001', device: 'cam0-lidar1', capturedAt: '2024-09-10 10:25', claimedAt: null, status: '待标注领取', type: '新标注数据', tags: ['车辆'] },
  { id: 'P-3002', kind: '3d', clip: 'clip_1002', device: 'cam1-lidar1', capturedAt: '2024-09-11 09:18', claimedAt: '2024-10-02 12:10', status: '标注中', type: '预标注任务', tags: ['行人'] },
  { id: 'P-4001', kind: 'occ', clip: 'clip_2001', device: 'cam2-lidar1', capturedAt: '2024-09-12 15:03', claimedAt: '2024-10-03 09:10', status: '待审核', type: '重标注任务', tags: ['可见性'] },
  { id: 'P-4002', kind: 'occ', clip: 'clip_2002', device: 'cam2-lidar2', capturedAt: '2024-09-14 11:03', claimedAt: '2024-10-05 10:00', status: '审核中', type: '预标注任务', tags: ['遮挡'] },
  { id: 'P-5001', kind: 'bev', clip: 'clip_3001', device: 'cam3-lidar2', capturedAt: '2024-09-12 16:55', claimedAt: null, status: '驳回标注', type: '新标注数据', tags: ['车道线'] },
  { id: 'P-5002', kind: 'bev', clip: 'clip_3002', device: 'cam3-lidar2', capturedAt: '2024-09-15 09:40', claimedAt: null, status: '待验收', type: '重标注任务', tags: ['路面元素'] },
  { id: 'P-6001', kind: 'traffic', clip: 'clip_4001', device: 'cam4-lidar2', capturedAt: '2024-09-13 08:20', claimedAt: '2024-10-06 15:22', status: '验收中', type: '新标注数据', tags: ['红绿灯'] },
  { id: 'P-6002', kind: 'traffic', clip: 'clip_4002', device: 'cam4-lidar3', capturedAt: '2024-09-18 12:20', claimedAt: null, status: '驳回审核', type: '预标注任务', tags: ['红绿灯'] },
  { id: 'P-7001', kind: '3d', clip: 'clip_1003', device: 'cam0-lidar1', capturedAt: '2024-09-19 17:25', claimedAt: '2024-10-07 09:02', status: '已通过', type: '新标注数据', tags: ['车辆'] },
]

export default function ProductionManage() {
  const { kind } = useParams()
  const navigate = useNavigate()
  // 读取当前角色
  const userRole = (() => {
    try {
      const raw = localStorage.getItem('da_user')
      return raw ? JSON.parse(raw).role : '标注员'
    } catch {
      return '标注员'
    }
  })()

  const getRoleClaimSource = (role) => {
    if (role === '审核员') return '待审核'
    if (role === '验收员') return '待验收'
    return '待标注领取'
  }
  const getRoleProgressStatus = (role) => {
    if (role === '审核员') return '审核中'
    if (role === '验收员') return '验收中'
    return '标注中'
  }
  const roleClaimSource = getRoleClaimSource(userRole)
  const roleProgressStatus = getRoleProgressStatus(userRole)

  const roleTabs = roleTabsFor(userRole)
  const [active, setActive] = useState(roleTabs[0])
  const [typeFilter, setTypeFilter] = useState('全部')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [tag, setTag] = useState('')
  const [claimCount, setClaimCount] = useState(1)

  const [tasks, setTasks] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetchTasks({ kind, status: active, type: typeFilter, start, end, tag, page, pageSize })
      const data = (res && Array.isArray(res.data) && res.data.length > 0) ? res.data : sample
      setTasks(data)
      setTotal(data.length)
    } catch (e) {
      setError(e.message || '加载失败（已展示示例数据）')
      setTasks(sample)
      setTotal(sample.length)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [kind, active, typeFilter, start, end, tag, page, pageSize])

  const filtered = useMemo(() => {
    const startTime = start ? new Date(start).getTime() : null
    const endTime = end ? new Date(end).getTime() : null
    return tasks.filter((t) => {
      if (t.status !== active) return false
      // 验收员不应看到任何“审核中”数据（双重保护，即使切换状态异常也隐藏）
      if (userRole === '验收员' && t.status === '审核中') return false
      // 审核/验收角色仅能看到该角色“已领取”的数据（审核中/验收中需有 claimedAt）
      if (userRole === '审核员' && active === '审核中' && !t.claimedAt) return false
      if (userRole === '验收员' && active === '验收中' && !t.claimedAt) return false
      if (typeFilter !== '全部' && t.type !== typeFilter) return false
      const cap = new Date(t.capturedAt.replace(' ', 'T')).getTime()
      if (startTime && cap < startTime) return false
      if (endTime && cap > endTime) return false
      if (tag && !t.tags.join(',').includes(tag)) return false
      return true
    })
  }, [tasks, active, typeFilter, start, end, tag])

  const [claiming, setClaiming] = useState(false)
  const onClaim = async () => {
    if (claiming || loading) return
    setClaiming(true); setError('')
    try {
      await claimTasks({ kind, count: claimCount, role: userRole, status: roleClaimSource })
      setActive(roleProgressStatus)
      await load()
    } catch (e) {
      setError(e.message || '领取失败')
    } finally {
      setClaiming(false)
    }
  }

  const enterPage = () => navigate(routeForKind(kind))
  const onSubmitLabel = async (id) => {
    try {
      await submitTask({ id })
      await load()
    } catch (e) {
      setError(e.message || '提交失败')
    }
  }
  const onAuditPass = async (id) => {
    try {
      await reviewTask({ id, action: 'pass' })
      await load()
    } catch (e) {
      setError(e.message || '审核通过失败')
    }
  }
  const onAuditReject = async (id) => {
    try {
      await reviewTask({ id, action: 'reject' })
      await load()
    } catch (e) {
      setError(e.message || '审核驳回失败')
    }
  }
  const onAcceptPass = async (id) => {
    try {
      await acceptTask({ id, action: 'pass' })
      await load()
    } catch (e) {
      setError(e.message || '验收通过失败')
    }
  }
  const onAcceptReturn = async (id) => {
    try {
      await acceptTask({ id, action: 'return' })
      await load()
    } catch (e) {
      setError(e.message || '退回失败')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 600 }}>生产任务管理（{labelForKind(kind)}）</div>

      <div style={{ display: 'flex', gap: 8 }}>
        {roleTabs.map((t) => (
          <button key={t} onClick={() => setActive(t)} style={{ ...tabBtn, background: active === t ? '#2563eb' : '#e5e7eb', color: active === t ? '#fff' : '#111827' }}>{t}</button>
        ))}
      </div>

      <div style={filterBar}>
        <label style={label}>数据类型
          <select style={input} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option>全部</option>
            {dataTypes.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>
        <label style={label}>采集时间（起）
          <input style={input} type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label style={label}>采集时间（止）
          <input style={input} type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <label style={label}>数据标签
          <input style={input} value={tag} onChange={(e) => setTag(e.target.value)} placeholder="如 车辆/行人/车道线/红绿灯" />
        </label>
        <label style={label}>领取数量
          <input style={input} type="number" min={1} max={20} value={claimCount} onChange={(e) => setClaimCount(Number(e.target.value))} />
        </label>
        <button style={{ ...primaryBtn, opacity: claiming || loading ? 0.7 : 1, cursor: claiming || loading ? 'not-allowed' : 'pointer' }} onClick={onClaim} disabled={claiming || loading}>{claimLabelForRole(userRole)}</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#6b7280' }}>快捷入口：</span>
        {quickStatusesForRole(userRole).map((s) => (
          <button key={s} onClick={() => setActive(s)} style={{ ...tabBtn, background: active === s ? '#2563eb' : '#e5e7eb', color: active === s ? '#fff' : '#111827' }}>{s}</button>
        ))}
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 10, borderRadius: 6 }}>错误：{error}</div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
        <thead>
          <tr>
            {['clip name', '采集设备代码', '采集时间', '任务领取时间', '状态', '操作'].map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td style={{ ...td, textAlign: 'center' }} colSpan={6}>加载中...</td></tr>
          )}
          {!loading && filtered.map((t) => (
            <tr key={t.id}>
              <td style={td}>{t.clip}</td>
              <td style={td}>{t.device}</td>
              <td style={td}>{t.capturedAt}</td>
              <td style={td}>{t.claimedAt || '-'}</td>
              <td style={td}>{t.status}</td>
              <td style={td}>
                {renderOps(userRole, { t, enterPage, onSubmitLabel, onAuditPass, onAuditReject, onAcceptPass, onAcceptReturn })}
              </td>
            </tr>
          ))}
          {!loading && filtered.length === 0 && (
            <tr><td style={{ ...td, textAlign: 'center' }} colSpan={6}>暂无数据</td></tr>
          )}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <span style={{ color: '#6b7280' }}>共 {total} 条</span>
        <label style={label}>每页
          <select style={input} value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}>
            {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button style={btn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>上一页</button>
        <span style={{ alignSelf: 'center' }}>第 {page} 页</span>
        <button style={btn} onClick={() => setPage((p) => p + 1)} disabled={tasks.length < pageSize}>下一页</button>
      </div>
    </div>
  )
}

function claimLabelForRole(role) {
  if (role === '审核员') return '领取待审核数据'
  if (role === '验收员') return '领取待验收数据'
  if (role === '管理员') return '领取任务（受限）'
  return '领取待标注数据'
}

// 角色快捷入口映射（用于首页进入后快速切换常用状态）
function quickStatusesForRole(role) {
  if (role === '标注员') return ['标注中', '驳回标注']
  if (role === '审核员') return ['审核中', '驳回审核']
  if (role === '验收员') return ['验收中']
  if (role === '管理员') return ['标注中', '驳回标注', '审核中', '驳回审核', '验收中']
  return ['标注中']
}

function renderOps(role, handlers) {
  const { t, enterPage, onSubmitLabel, onAuditPass, onAuditReject, onAcceptPass, onAcceptReturn } = handlers
  if (role === '标注员') {
    if (t.status === '标注中' || t.status === '驳回标注') {
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btn} onClick={() => enterPage()}>进入标注</button>
          <button style={{ ...btn, background: '#16a34a' }} onClick={() => onSubmitLabel(t.id)}>提交</button>
        </div>
      )
    }
    return <span style={{ color: '#6b7280' }}>无操作</span>
  }
  if (role === '审核员') {
    if (t.status === '审核中') {
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btn} onClick={() => enterPage()}>进入审核</button>
          <button style={{ ...btn, background: '#16a34a' }} onClick={() => onAuditPass(t.id)}>通过</button>
          <button style={{ ...btn, background: '#ef4444' }} onClick={() => onAuditReject(t.id)}>驳回</button>
        </div>
      )
    }
    if (t.status === '驳回审核') {
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btn} onClick={() => enterPage()}>查看数据</button>
          <button style={btn} onClick={() => enterPage()}>进入审核</button>
        </div>
      )
    }
    return <span style={{ color: '#6b7280' }}>无操作</span>
  }
  if (role === '验收员') {
    if (t.status === '验收中') {
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btn} onClick={() => enterPage()}>进入验收</button>
          <button style={{ ...btn, background: '#16a34a' }} onClick={() => onAcceptPass(t.id)}>通过</button>
          <button style={{ ...btn, background: '#f59e0b' }} onClick={() => onAcceptReturn(t.id)}>退回</button>
        </div>
      )
    }
    return <span style={{ color: '#6b7280' }}>无操作</span>
  }
  return <span style={{ color: '#6b7280' }}>无操作</span>
}

function labelForKind(kind) {
  switch (kind) {
    case '3d': return '23D目标物'
    case 'occ': return 'OCC'
    case 'bev': return 'BEV路面元素标注'
    case 'traffic': return '红绿灯标注'
    default: return kind
  }
}

const tabBtn = { padding: '8px 10px', border: 'none', borderRadius: 6, cursor: 'pointer' }
const filterBar = { display: 'flex', alignItems: 'flex-end', gap: 12, background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }
const label = { display: 'flex', flexDirection: 'column', fontSize: 12, color: '#6b7280' }
const input = { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6 }
const primaryBtn = { padding: '10px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }
const btn = { padding: '8px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }
const th = { textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb', fontWeight: 600 }
const td = { padding: 10, borderBottom: '1px solid #f3f4f6' }