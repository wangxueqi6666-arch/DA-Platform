import React, { useMemo, useState } from 'react'

const sampleTasks = [
  { id: 'A-1001', clip: 'clip_0001', device: 'cam0-lidar1', capturedAt: '2024-09-10 10:25', claimedAt: null, status: '待标注', type: '新标注数据', batch: 'B001' },
  { id: 'A-1002', clip: 'clip_0002', device: 'cam1-lidar1', capturedAt: '2024-09-11 09:18', claimedAt: '2024-10-02 12:10', status: '标注中', type: '预标注任务', batch: 'B002' },
  { id: 'A-1003', clip: 'clip_0003', device: 'cam2-lidar1', capturedAt: '2024-09-12 15:03', claimedAt: '2024-10-03 09:10', status: '已提交审核', type: '重标注任务', batch: 'B003' },
  { id: 'A-1004', clip: 'clip_0004', device: 'cam3-lidar2', capturedAt: '2024-09-12 16:55', claimedAt: null, status: '已驳回', type: '新标注数据', batch: 'B001' },
]

const tabs = ['待标注', '标注中', '已提交审核', '已驳回']
const types = ['新标注数据', '预标注任务', '重标注任务']

export default function TaskBoard() {
  const [active, setActive] = useState('待标注')
  const [filterType, setFilterType] = useState('全部')
  const [batch, setBatch] = useState('')
  const [claimCount, setClaimCount] = useState(1)
  const [tasks, setTasks] = useState(sampleTasks)

  const filtered = useMemo(() => {
    return tasks.filter((t) =>
      (t.status === active) &&
      (filterType === '全部' || t.type === filterType) &&
      (!batch || t.batch.includes(batch))
    )
  }, [tasks, active, filterType, batch])

  const onClaim = () => {
    const available = tasks.filter((t) => t.status === '待标注' && !t.claimedAt)
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
    let taken = 0
    const next = tasks.map((t) => {
      if (available.includes(t) && taken < claimCount) {
        taken += 1
        return { ...t, claimedAt: now, status: '标注中' }
      }
      return t
    })
    setTasks(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {tabs.map((t) => (
          <button key={t} onClick={() => setActive(t)} style={{ ...tabBtn, background: active === t ? '#2563eb' : '#e5e7eb', color: active === t ? '#fff' : '#111827' }}>{t}</button>
        ))}
      </div>

      <div style={filterBar}>
        <div>
          <label style={label}>数据类型
            <select style={input} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option>全部</option>
              {types.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <div>
          <label style={label}>任务批次
            <input style={input} placeholder="如 B001" value={batch} onChange={(e) => setBatch(e.target.value)} />
          </label>
        </div>
        <div>
          <label style={label}>领取数量
            <input style={input} type="number" min={1} max={10} value={claimCount} onChange={(e) => setClaimCount(Number(e.target.value))} />
          </label>
        </div>
        <button style={primaryBtn} onClick={onClaim}>领取任务</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
        <thead>
          <tr>
            {['clip name', '采集设备代码', '采集时间', '任务领取时间', '状态'].map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((t) => (
            <tr key={t.id}>
              <td style={td}>{t.clip}</td>
              <td style={td}>{t.device}</td>
              <td style={td}>{t.capturedAt}</td>
              <td style={td}>{t.claimedAt || '-'}</td>
              <td style={td}>{t.status}</td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td style={{ ...td, textAlign: 'center' }} colSpan={5}>暂无数据</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const tabBtn = { padding: '8px 10px', border: 'none', borderRadius: 6, cursor: 'pointer' }
const filterBar = { display: 'flex', alignItems: 'flex-end', gap: 12, background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }
const label = { display: 'flex', flexDirection: 'column', fontSize: 12, color: '#6b7280' }
const input = { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6 }
const primaryBtn = { padding: '10px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }
const th = { textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb', fontWeight: 600 }
const td = { padding: 10, borderBottom: '1px solid #f3f4f6' }