import React, { useMemo, useState } from 'react'

export default function Stats() {
  const [activeTab, setActiveTab] = useState('生产运营管理统计')
  const [filters, setFilters] = useState({
    labelProject: '',
    productionGroup: '',
    accounts: [],
    role: '',
    project: '',
    startDate: '',
    endDate: '',
    display: '日',
    tag: '',
    priority: '',
    device: '',
    batches: [],
    captureStart: '',
    captureEnd: '',
    accountsOpen: false,
    batchesOpen: false,
  })

  const allAccounts = ['acc_001', 'acc_002', 'acc_003', 'acc_004']
  const allBatches = ['batch_A', 'batch_B', 'batch_C']
  const allRoles = ['标注员', '审核员', '验收员', '管理员']
  const allProjects = ['道路元素', '23D目标物', 'OCC', '红绿灯']

  // 假数据：用于统计计算（为每个项目创建多个批次，且每批次包含各环节样例）
  const raw = useMemo(() => {
    const projects = allProjects
    const batches = allBatches
    const rolesArr = ['标注员','审核员','验收员']
    const accountOfRole = { 标注员: 'acc_001', 审核员: 'acc_002', 验收员: 'acc_003' }
    const nameOfAccount = { acc_001: '张三', acc_002: '李四', acc_003: '王五' }
    const tags = ['车辆','路缘石','可见性','红灯','绿灯','行人']
    const devices = ['cam0','cam1','cam2','lidar1','cam3']
    const list = []
    let day = 1
    projects.forEach((proj, pi) => {
      batches.forEach((batch, bi) => {
        rolesArr.forEach((role, ri) => {
          const account = accountOfRole[role]
          const name = nameOfAccount[account]
          const elements = 50 + pi * 10 + bi * 5 + ri * 7
          const frames = 20 + pi * 5 + bi * 3 + ri * 4
          const clips = 2 + ri
          const hours = 3 + ri * 0.8 + bi * 0.3
          const tag = tags[(pi + bi + ri) % tags.length]
          const priority = ['高','中','低'][(pi + bi + ri) % 3]
          const device = devices[(pi + bi) % devices.length]
          const date = `2024-10-${String(1 + (day % 28)).padStart(2, '0')}`
          const captureTime = `${date} ${String(8 + ri).padStart(2, '0')}:${String(30 + bi * 5).padStart(2, '0')}`
          list.push({ account, name, role, project: proj, date, elements, frames, clips, hours, tag, priority, device, batch, captureTime })
          day += 1
        })
      })
    })
    return list
  }, [])

  const filtered = useMemo(() => {
    return raw.filter((r) => {
      const inAccount = filters.accounts.length ? filters.accounts.includes(r.account) : true
      const inBatch = filters.batches.length ? filters.batches.includes(r.batch) : true
      const inRole = filters.role ? r.role === filters.role : true
      const inProject = filters.project ? r.project === filters.project : true
      const inTag = filters.tag ? r.tag.includes(filters.tag) : true
      const inPriority = filters.priority ? r.priority === filters.priority : true
      const inDevice = filters.device ? r.device === filters.device : true
      const inLabelProject = filters.labelProject ? r.project.includes(filters.labelProject) : true
      const inGroup = filters.productionGroup ? true : true // 生产组示例字段缺失，先放行
      const inDate = (() => {
        if (!filters.startDate && !filters.endDate) return true
        const ts = new Date(r.date).getTime()
        const s = filters.startDate ? new Date(filters.startDate).getTime() : -Infinity
        const e = filters.endDate ? new Date(filters.endDate).getTime() : Infinity
        return ts >= s && ts <= e
      })()
      const inCapture = (() => {
        if (!filters.captureStart && !filters.captureEnd) return true
        const ts = new Date(r.captureTime.replace(' ', 'T')).getTime()
        const s = filters.captureStart ? new Date(filters.captureStart).getTime() : -Infinity
        const e = filters.captureEnd ? new Date(filters.captureEnd).getTime() : Infinity
        return ts >= s && ts <= e
      })()
      return inAccount && inBatch && inRole && inProject && inTag && inPriority && inDevice && inLabelProject && inGroup && inDate && inCapture
    })
  }, [raw, filters])

  const periodKey = (d) => {
    const date = new Date(d)
    if (filters.display === '月') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (filters.display === '周') {
      const tmp = new Date(date)
      const dayNum = (date.getDay() + 6) % 7
      tmp.setDate(date.getDate() - dayNum + 3)
      const firstThursday = new Date(tmp.getFullYear(), 0, 4)
      const week = 1 + Math.round(((tmp.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7)
      return `${tmp.getFullYear()}-W${String(week).padStart(2, '0')}`
    }
    return d
  }

  const grouped = useMemo(() => {
    const map = new Map()
    for (const r of filtered) {
      const key = `${r.account}|${r.project}`
      if (!map.has(key)) {
        map.set(key, { account: r.account, name: r.name, role: r.role, project: r.project, total: { elements: 0, frames: 0, clips: 0, hours: 0 }, periods: {} })
      }
      const g = map.get(key)
      g.total.elements += r.elements
      g.total.frames += r.frames
      g.total.clips += r.clips
      g.total.hours += r.hours
      const pk = periodKey(r.date)
      if (!g.periods[pk]) g.periods[pk] = { elements: 0, frames: 0, clips: 0, hours: 0 }
      g.periods[pk].elements += r.elements
      g.periods[pk].frames += r.frames
      g.periods[pk].clips += r.clips
      g.periods[pk].hours += r.hours
    }
    return Array.from(map.values())
  }, [filtered, filters.display])

  // 统一所有分期列头（日期/周/月），动态生成列
  const allPeriods = useMemo(() => {
    const set = new Set()
    grouped.forEach((g) => Object.keys(g.periods).forEach((k) => set.add(k)))
    return Array.from(set).sort()
  }, [grouped])

  const exportStatsCSV = () => {
    const fixedHeaders = ['账号','姓名','角色','项目','合计元素产量','合计帧产量','合计Clip产量','合计有效工时']
    const dynamicHeaders = allPeriods.flatMap((p) => [`${p}-元素`,`${p}-帧`,`${p}-Clip`,`${p}-工时`])
    const headers = [...fixedHeaders, ...dynamicHeaders]
    const rows = grouped.map((g) => {
      const base = [g.account, g.name, g.role, g.project, g.total.elements, g.total.frames, g.total.clips, g.total.hours.toFixed(1)]
      const dyn = allPeriods.flatMap((p) => {
        const v = g.periods[p] || { elements: 0, frames: 0, clips: 0, hours: 0 }
        return [v.elements, v.frames, v.clips, v.hours.toFixed(1)]
      })
      return [...base, ...dyn]
    })
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `生产运营管理统计_${filters.display}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 数据管理统计（示例数据与导出）
  const dataManageRaw = useMemo(() => ([
    {
      clip: 'clip_0001',
      annotators: ['acc_001','acc_004'],
      reviewers: ['acc_002'],
      acceptors: ['acc_003'],
      role: '标注员',
      project: '道路元素',
      box2d: 35,
      box3d: 12,
      lines: 28,
      segGroups: 6,
      frames: 120,
      labelRejectCount: 1,
      reviewRejectCount: 0,
      claimedAt: '2024-10-01 09:00',
      firstLabelStart: '2024-10-01 09:10',
      labelDuration: 2.5,
      lastSubmitToReview: '2024-10-01 12:00',
      reviewPassAt: '2024-10-02 09:30',
      reviewDuration: 1.2,
      lastSubmitToAccept: '2024-10-02 10:00',
      acceptDuration: 0.8,
      acceptPassAt: '2024-10-02 11:00',
    },
    {
      clip: 'clip_0002',
      annotators: ['acc_004'],
      reviewers: ['acc_002'],
      acceptors: ['acc_003'],
      role: '审核员',
      project: 'OCC',
      box2d: 20,
      box3d: 10,
      lines: 14,
      segGroups: 3,
      frames: 88,
      labelRejectCount: 2,
      reviewRejectCount: 1,
      claimedAt: '2024-10-03 08:40',
      firstLabelStart: '2024-10-03 08:55',
      labelDuration: 2.0,
      lastSubmitToReview: '2024-10-03 11:10',
      reviewPassAt: '2024-10-04 10:20',
      reviewDuration: 1.0,
      lastSubmitToAccept: '2024-10-04 10:40',
      acceptDuration: 0.6,
      acceptPassAt: '2024-10-04 11:30',
    },
  ]), [])

  const getLast = (arr) => (Array.isArray(arr) && arr.length ? arr[arr.length - 1] : '')

  // 根据记录推断数据状态
  const hasVal = (v) => !!(v && String(v).trim().length)
  const deriveStatus = (r) => {
    const hasReviewer = Array.isArray(r.reviewers) && r.reviewers.length > 0
    const hasAcceptor = Array.isArray(r.acceptors) && r.acceptors.length > 0
    const labelRejected = !!r.labelRejected
    const reviewRejected = !!r.reviewRejected
    if (!hasVal(r.claimedAt)) return '待领取'
    if (labelRejected) return '驳回标注'
    if (hasVal(r.firstLabelStart) && !hasVal(r.lastSubmitToReview)) return '标注中'
    if (hasVal(r.lastSubmitToReview) && !hasVal(r.reviewPassAt)) {
      return hasReviewer ? '审核中' : '待审核领取'
    }
    if (reviewRejected) return '驳回审核'
    if (hasVal(r.reviewPassAt) && !hasVal(r.lastSubmitToAccept)) return '待验收领取'
    if (hasVal(r.lastSubmitToAccept) && !hasVal(r.acceptPassAt)) {
      return hasAcceptor ? '验收中' : '待验收领取'
    }
    if (hasVal(r.acceptPassAt)) return '已通过'
    return '标注中'
  }

  const exportDataManageCSV = () => {
    const headers = ['clip name','标注员账号','质检员账号','验收员账号','数据状态','标注项目','clip2D框元素量','clip3D框元素量','clip线元素量','clip分割元素组量','clip帧数','驳回标注次数','驳回审核次数','数据领取时间','首次开始标注时间','标注时长','最近一次提交到审核时间','审核通过时间','审核时长','最近一次提交到验收时间','验收时长','验收通过时间']
    const rows = dataManageRaw.map((r) => [
      r.clip,
      getLast(r.annotators),
      getLast(r.reviewers),
      getLast(r.acceptors),
      deriveStatus(r),
      r.project,
      r.box2d,
      r.box3d,
      r.lines,
      r.segGroups,
      r.frames,
      r.labelRejectCount ?? 0,
      r.reviewRejectCount ?? 0,
      r.claimedAt,
      r.firstLabelStart,
      r.labelDuration,
      r.lastSubmitToReview,
      r.reviewPassAt,
      r.reviewDuration,
      r.lastSubmitToAccept,
      r.acceptDuration,
      r.acceptPassAt,
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `数据管理统计.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // autolabel 标注数据统计（示例数据与导出）
  const autolabelRaw = useMemo(() => ([
    {
      clip: 'clip_1001',
      annotators: ['acc_001'],
      reviewers: ['acc_002'],
      acceptors: ['acc_003'],
      role: '标注员',
      project: '道路元素',
      box2d: 40,
      box3d: 15,
      lines: 25,
      segGroups: 5,
      frames: 96,
      labelRejectCount: 0,
      reviewRejectCount: 1,
      claimedAt: '2024-10-05 09:00',
      firstLabelStart: '2024-10-05 09:10',
      labelDuration: 2.3,
      lastSubmitToReview: '2024-10-05 11:40',
      reviewPassAt: '2024-10-06 10:10',
      reviewDuration: 1.1,
      lastSubmitToAccept: '2024-10-06 10:30',
      acceptDuration: 0.7,
      acceptPassAt: '2024-10-06 11:20',
      deletedTargets: 3,
      boxesAdded: 18,
      boxesModified: 9,
      boxesUntouched: 12,
    },
    {
      clip: 'clip_1002',
      annotators: ['acc_004'],
      reviewers: ['acc_002'],
      acceptors: ['acc_003'],
      role: '审核员',
      project: 'OCC',
      box2d: 22,
      box3d: 8,
      lines: 16,
      segGroups: 4,
      frames: 80,
      labelRejectCount: 2,
      reviewRejectCount: 0,
      claimedAt: '2024-10-07 08:30',
      firstLabelStart: '2024-10-07 08:45',
      labelDuration: 1.9,
      lastSubmitToReview: '2024-10-07 10:50',
      reviewPassAt: '2024-10-08 09:50',
      reviewDuration: 0.9,
      lastSubmitToAccept: '2024-10-08 10:20',
      acceptDuration: 0.5,
      acceptPassAt: '2024-10-08 11:10',
      deletedTargets: 5,
      boxesAdded: 12,
      boxesModified: 14,
      boxesUntouched: 20,
    },
  ]), [])

  const exportAutolabelCSV = () => {
    const headers = ['clip name','标注员账号','质检员账号','验收员账号','数据状态','标注项目','clip2D框元素量','clip3D框元素量','clip线元素量','clip分割元素组量','clip帧数','驳回标注次数','驳回审核次数','数据领取时间','首次开始标注时间','标注时长','最近一次提交到审核时间','审核通过时间','审核时长','最近一次提交到验收时间','验收时长','验收通过时间','删除目标物量','新增框体量','修改框体量','未调整框体量']
    const rows = autolabelRaw.map((r) => [
      r.clip,
      getLast(r.annotators),
      getLast(r.reviewers),
      getLast(r.acceptors),
      deriveStatus(r),
      r.project,
      r.box2d,
      r.box3d,
      r.lines,
      r.segGroups,
      r.frames,
      r.labelRejectCount ?? 0,
      r.reviewRejectCount ?? 0,
      r.claimedAt,
      r.firstLabelStart,
      r.labelDuration,
      r.lastSubmitToReview,
      r.reviewPassAt,
      r.reviewDuration,
      r.lastSubmitToAccept,
      r.acceptDuration,
      r.acceptPassAt,
      r.deletedTargets,
      r.boxesAdded,
      r.boxesModified,
      r.boxesUntouched,
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `autolabel标注数据统计.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const update = (k, v) => setFilters((f) => ({ ...f, [k]: v }))
  const toggleMulti = (k, v) => setFilters((f) => {
    const arr = new Set(f[k])
    if (arr.has(v)) arr.delete(v); else arr.add(v)
    return { ...f, [k]: Array.from(arr) }
  })
  const reset = () => setFilters({ labelProject: '', productionGroup: '', accounts: [], role: '', project: '', startDate: '', endDate: '', display: '日', tag: '', priority: '', device: '', batches: [], captureStart: '', captureEnd: '', accountsOpen: false, batchesOpen: false })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {['生产运营管理统计','数据管理统计','autolabel标注数据统计','项目管理统计'].map((t) => (
          <button key={t} style={{ ...tabBtn, background: activeTab === t ? '#2563eb' : '#e5e7eb', color: activeTab === t ? '#fff' : '#111827' }} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {activeTab === '生产运营管理统计' && (
      <div style={panel}>
        <div style={panelTitle}>统计查询</div>
        <div style={filtersGrid}>
          <label style={label}>标注项目
            <input style={input} value={filters.labelProject} onChange={(e) => update('labelProject', e.target.value)} placeholder="如 道路元素/23D目标物" />
          </label>
          <label style={label}>生产组
            <input style={input} value={filters.productionGroup} onChange={(e) => update('productionGroup', e.target.value)} placeholder="如 A组/B组" />
          </label>
          <div style={label}>账号（多选）
            <div style={dropdown}>
              <button style={dropdownTrigger} onClick={() => update('accountsOpen', !(filters.accountsOpen))}>
                {filters.accounts.length ? `${filters.accounts.length} 个已选` : '选择账号'}
                <span style={{ marginLeft: 'auto', color: '#6b7280' }}>{filters.accountsOpen ? '▲' : '▼'}</span>
              </button>
              {filters.accountsOpen && (
                <div style={dropdownPanel}>
                  {allAccounts.map((a) => (
                    <label key={a} style={optionRow}>
                      <input type="checkbox" checked={filters.accounts.includes(a)} onChange={() => toggleMulti('accounts', a)} />
                      <span>{a}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <label style={label}>角色
            <select style={input} value={filters.role} onChange={(e) => update('role', e.target.value)}>
              <option value="">全部</option>
              {allRoles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label style={label}>项目
            <select style={input} value={filters.project} onChange={(e) => update('project', e.target.value)}>
              <option value="">全部</option>
              {allProjects.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label style={label}>开始日期
            <input style={input} type="date" value={filters.startDate} onChange={(e) => update('startDate', e.target.value)} />
          </label>
          <label style={label}>结束日期
            <input style={input} type="date" value={filters.endDate} onChange={(e) => update('endDate', e.target.value)} />
          </label>
          <label style={label}>展示形式
            <select style={input} value={filters.display} onChange={(e) => update('display', e.target.value)}>
              {['日', '周', '月'].map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label style={label}>数据标签
            <input style={input} value={filters.tag} onChange={(e) => update('tag', e.target.value)} placeholder="如 车道线/红绿灯" />
          </label>
          <label style={label}>优先级
            <select style={input} value={filters.priority} onChange={(e) => update('priority', e.target.value)}>
              <option value="">全部</option>
              {['高', '中', '低'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label style={label}>数采设备
            <input style={input} value={filters.device} onChange={(e) => update('device', e.target.value)} placeholder="如 cam0/lidar1" />
          </label>
          <div style={label}>送标批次（多选）
            <div style={dropdown}>
              <button style={dropdownTrigger} onClick={() => update('batchesOpen', !(filters.batchesOpen))}>
                {filters.batches.length ? `${filters.batches.length} 个已选` : '选择批次'}
                <span style={{ marginLeft: 'auto', color: '#6b7280' }}>{filters.batchesOpen ? '▲' : '▼'}</span>
              </button>
              {filters.batchesOpen && (
                <div style={dropdownPanel}>
                  {allBatches.map((b) => (
                    <label key={b} style={optionRow}>
                      <input type="checkbox" checked={filters.batches.includes(b)} onChange={() => toggleMulti('batches', b)} />
                      <span>{b}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <label style={label}>数采时间（起）
            <input style={input} type="datetime-local" value={filters.captureStart} onChange={(e) => update('captureStart', e.target.value)} />
          </label>
          <label style={label}>数采时间（止）
            <input style={input} type="datetime-local" value={filters.captureEnd} onChange={(e) => update('captureEnd', e.target.value)} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={primaryBtn} onClick={() => { /* 前端实时计算，无需请求 */ }}>查询</button>
          <button style={btn} onClick={reset}>重置</button>
          <button style={btn} onClick={exportStatsCSV}>导出</button>
        </div>
      </div>
      )}

      {activeTab === '生产运营管理统计' && (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['账号','姓名','角色','项目','合计元素产量','合计帧产量','合计Clip产量','合计有效工时'].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
              {allPeriods.map((p) => (
                <th key={p} style={{ ...th, textAlign: 'center' }} colSpan={4}>{p}</th>
              ))}
            </tr>
            <tr>
              {Array(8).fill(0).map((_, i) => <th key={`fixed-${i}`} style={th}></th>)}
              {allPeriods.flatMap((p, idx) => (
                ['元素产量','帧产量','Clip产量','有效工时'].map((sub) => <th key={`${p}-${sub}-${idx}`} style={th}>{sub}</th>)
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map((g) => (
              <tr key={`${g.account}-${g.project}`}>
                <td style={td}>{g.account}</td>
                <td style={td}>{g.name}</td>
                <td style={td}>{g.role}</td>
                <td style={td}>{g.project}</td>
                <td style={td}>{g.total.elements}</td>
                <td style={td}>{g.total.frames}</td>
                <td style={td}>{g.total.clips}</td>
                <td style={td}>{g.total.hours.toFixed(1)}</td>
                {allPeriods.flatMap((p) => {
                  const v = g.periods[p] || { elements: 0, frames: 0, clips: 0, hours: 0 }
                  return [
                    <td key={`${g.account}-${g.project}-${p}-elements`} style={td}>{v.elements}</td>,
                    <td key={`${g.account}-${g.project}-${p}-frames`} style={td}>{v.frames}</td>,
                    <td key={`${g.account}-${g.project}-${p}-clips`} style={td}>{v.clips}</td>,
                    <td key={`${g.account}-${g.project}-${p}-hours`} style={td}>{v.hours.toFixed(1)}</td>,
                  ]
                })}
              </tr>
            ))}
            {grouped.length === 0 && (
              <tr><td style={{ ...td, textAlign: 'center' }} colSpan={8 + allPeriods.length * 4}>暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {activeTab === '数据管理统计' && (
        <>
          <div style={panel}>
            <div style={panelTitle}>数据管理统计查询</div>
            <div style={filtersGrid}>
              <label style={label}>标注项目
                <input style={input} value={filters.labelProject} onChange={(e) => update('labelProject', e.target.value)} placeholder="如 道路元素/23D目标物" />
              </label>
              <label style={label}>生产组
                <input style={input} value={filters.productionGroup} onChange={(e) => update('productionGroup', e.target.value)} placeholder="如 A组/B组" />
              </label>
              <div style={label}>账号（多选）
                <div style={dropdown}>
                  <button style={dropdownTrigger} onClick={() => update('accountsOpen', !(filters.accountsOpen))}>
                    {filters.accounts.length ? `${filters.accounts.length} 个已选` : '选择账号'}
                    <span style={{ marginLeft: 'auto', color: '#6b7280' }}>{filters.accountsOpen ? '▲' : '▼'}</span>
                  </button>
                  {filters.accountsOpen && (
                    <div style={dropdownPanel}>
                      {allAccounts.map((a) => (
                        <label key={a} style={optionRow}>
                          <input type="checkbox" checked={filters.accounts.includes(a)} onChange={() => toggleMulti('accounts', a)} />
                          <span>{a}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <label style={label}>角色
                <select style={input} value={filters.role} onChange={(e) => update('role', e.target.value)}>
                  <option value="">全部</option>
                  {allRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label style={label}>项目
                <select style={input} value={filters.project} onChange={(e) => update('project', e.target.value)}>
                  <option value="">全部</option>
                  {allProjects.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label style={label}>开始日期
                <input style={input} type="date" value={filters.startDate} onChange={(e) => update('startDate', e.target.value)} />
              </label>
              <label style={label}>结束日期
                <input style={input} type="date" value={filters.endDate} onChange={(e) => update('endDate', e.target.value)} />
              </label>
              <label style={label}>数据标签
                <input style={input} value={filters.tag} onChange={(e) => update('tag', e.target.value)} placeholder="如 车道线/红绿灯" />
              </label>
              <label style={label}>优先级
                <select style={input} value={filters.priority} onChange={(e) => update('priority', e.target.value)}>
                  <option value="">全部</option>
                  {['高', '中', '低'].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label style={label}>数采设备
                <input style={input} value={filters.device} onChange={(e) => update('device', e.target.value)} placeholder="如 cam0/lidar1" />
              </label>
              <div style={label}>送标批次（多选）
                <div style={dropdown}>
                  <button style={dropdownTrigger} onClick={() => update('batchesOpen', !(filters.batchesOpen))}>
                    {filters.batches.length ? `${filters.batches.length} 个已选` : '选择批次'}
                    <span style={{ marginLeft: 'auto', color: '#6b7280' }}>{filters.batchesOpen ? '▲' : '▼'}</span>
                  </button>
                  {filters.batchesOpen && (
                    <div style={dropdownPanel}>
                      {allBatches.map((b) => (
                        <label key={b} style={optionRow}>
                          <input type="checkbox" checked={filters.batches.includes(b)} onChange={() => toggleMulti('batches', b)} />
                          <span>{b}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <label style={label}>数采时间（起）
                <input style={input} type="datetime-local" value={filters.captureStart} onChange={(e) => update('captureStart', e.target.value)} />
              </label>
              <label style={label}>数采时间（止）
                <input style={input} type="datetime-local" value={filters.captureEnd} onChange={(e) => update('captureEnd', e.target.value)} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={primaryBtn}>查询</button>
              <button style={btn} onClick={reset}>重置</button>
              <button style={btn} onClick={exportDataManageCSV}>导出</button>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['clip name','标注员账号','质检员账号','验收员账号','数据状态','标注项目','clip2D框元素量','clip3D框元素量','clip线元素量','clip分割元素组量','clip帧数','驳回标注次数','驳回审核次数','数据领取时间','首次开始标注时间','标注时长','最近一次提交到审核时间','审核通过时间','审核时长','最近一次提交到验收时间','验收时长','验收通过时间'].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataManageRaw.map((r) => (
                  <tr key={r.clip}>
                    <td style={td}>{r.clip}</td>
                    <td style={td}>{getLast(r.annotators)}</td>
                    <td style={td}>{getLast(r.reviewers)}</td>
                    <td style={td}>{getLast(r.acceptors)}</td>
                    <td style={td}>{deriveStatus(r)}</td>
                    <td style={td}>{r.project}</td>
                    <td style={td}>{r.box2d}</td>
                    <td style={td}>{r.box3d}</td>
                    <td style={td}>{r.lines}</td>
                    <td style={td}>{r.segGroups}</td>
                    <td style={td}>{r.frames}</td>
                    <td style={td}>{r.labelRejectCount ?? 0}</td>
                    <td style={td}>{r.reviewRejectCount ?? 0}</td>
                    <td style={td}>{r.claimedAt}</td>
                    <td style={td}>{r.firstLabelStart}</td>
                    <td style={td}>{r.labelDuration}</td>
                    <td style={td}>{r.lastSubmitToReview}</td>
                    <td style={td}>{r.reviewPassAt}</td>
                    <td style={td}>{r.reviewDuration}</td>
                    <td style={td}>{r.lastSubmitToAccept}</td>
                    <td style={td}>{r.acceptDuration}</td>
                    <td style={td}>{r.acceptPassAt}</td>
                  </tr>
                ))}
                {dataManageRaw.length === 0 && (
                  <tr><td style={{ ...td, textAlign: 'center' }} colSpan={22}>暂无数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'autolabel标注数据统计' && (
        <>
          <div style={panel}>
            <div style={panelTitle}>autolabel标注数据统计查询</div>
            <div style={filtersGrid}>
              <label style={label}>标注项目
                <input style={input} value={filters.labelProject} onChange={(e) => update('labelProject', e.target.value)} placeholder="如 道路元素/23D目标物" />
              </label>
              <label style={label}>生产组
                <input style={input} value={filters.productionGroup} onChange={(e) => update('productionGroup', e.target.value)} placeholder="如 A组/B组" />
              </label>
              <div style={label}>账号（多选）
                <div style={dropdown}>
                  <button style={dropdownTrigger} onClick={() => update('accountsOpen', !(filters.accountsOpen))}>
                    {filters.accounts.length ? `${filters.accounts.length} 个已选` : '选择账号'}
                    <span style={{ marginLeft: 'auto', color: '#6b7280' }}>{filters.accountsOpen ? '▲' : '▼'}</span>
                  </button>
                  {filters.accountsOpen && (
                    <div style={dropdownPanel}>
                      {allAccounts.map((a) => (
                        <label key={a} style={optionRow}>
                          <input type="checkbox" checked={filters.accounts.includes(a)} onChange={() => toggleMulti('accounts', a)} />
                          <span>{a}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <label style={label}>角色
                <select style={input} value={filters.role} onChange={(e) => update('role', e.target.value)}>
                  <option value="">全部</option>
                  {allRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label style={label}>项目
                <select style={input} value={filters.project} onChange={(e) => update('project', e.target.value)}>
                  <option value="">全部</option>
                  {allProjects.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label style={label}>开始日期
                <input style={input} type="date" value={filters.startDate} onChange={(e) => update('startDate', e.target.value)} />
              </label>
              <label style={label}>结束日期
                <input style={input} type="date" value={filters.endDate} onChange={(e) => update('endDate', e.target.value)} />
              </label>
              <label style={label}>数据标签
                <input style={input} value={filters.tag} onChange={(e) => update('tag', e.target.value)} placeholder="如 车道线/红绿灯" />
              </label>
              <label style={label}>优先级
                <select style={input} value={filters.priority} onChange={(e) => update('priority', e.target.value)}>
                  <option value="">全部</option>
                  {['高', '中', '低'].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label style={label}>数采设备
                <input style={input} value={filters.device} onChange={(e) => update('device', e.target.value)} placeholder="如 cam0/lidar1" />
              </label>
              <div style={label}>送标批次（多选）
                <div style={dropdown}>
                  <button style={dropdownTrigger} onClick={() => update('batchesOpen', !(filters.batchesOpen))}>
                    {filters.batches.length ? `${filters.batches.length} 个已选` : '选择批次'}
                    <span style={{ marginLeft: 'auto', color: '#6b7280' }}>{filters.batchesOpen ? '▲' : '▼'}</span>
                  </button>
                  {filters.batchesOpen && (
                    <div style={dropdownPanel}>
                      {allBatches.map((b) => (
                        <label key={b} style={optionRow}>
                          <input type="checkbox" checked={filters.batches.includes(b)} onChange={() => toggleMulti('batches', b)} />
                          <span>{b}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <label style={label}>数采时间（起）
                <input style={input} type="datetime-local" value={filters.captureStart} onChange={(e) => update('captureStart', e.target.value)} />
              </label>
              <label style={label}>数采时间（止）
                <input style={input} type="datetime-local" value={filters.captureEnd} onChange={(e) => update('captureEnd', e.target.value)} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={primaryBtn}>查询</button>
              <button style={btn} onClick={reset}>重置</button>
              <button style={btn} onClick={exportAutolabelCSV}>导出</button>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['clip name','标注员账号','质检员账号','验收员账号','数据状态','标注项目','clip2D框元素量','clip3D框元素量','clip线元素量','clip分割元素组量','clip帧数','驳回标注次数','驳回审核次数','数据领取时间','首次开始标注时间','标注时长','最近一次提交到审核时间','审核通过时间','审核时长','最近一次提交到验收时间','验收时长','验收通过时间','删除目标物量','新增框体量','修改框体量','未调整框体量'].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {autolabelRaw.map((r) => (
                  <tr key={r.clip}>
                    <td style={td}>{r.clip}</td>
                    <td style={td}>{getLast(r.annotators)}</td>
                    <td style={td}>{getLast(r.reviewers)}</td>
                    <td style={td}>{getLast(r.acceptors)}</td>
                    <td style={td}>{deriveStatus(r)}</td>
                    <td style={td}>{r.project}</td>
                    <td style={td}>{r.box2d}</td>
                    <td style={td}>{r.box3d}</td>
                    <td style={td}>{r.lines}</td>
                    <td style={td}>{r.segGroups}</td>
                    <td style={td}>{r.frames}</td>
                    <td style={td}>{r.labelRejectCount ?? 0}</td>
                    <td style={td}>{r.reviewRejectCount ?? 0}</td>
                    <td style={td}>{r.claimedAt}</td>
                    <td style={td}>{r.firstLabelStart}</td>
                    <td style={td}>{r.labelDuration}</td>
                    <td style={td}>{r.lastSubmitToReview}</td>
                    <td style={td}>{r.reviewPassAt}</td>
                    <td style={td}>{r.reviewDuration}</td>
                    <td style={td}>{r.lastSubmitToAccept}</td>
                    <td style={td}>{r.acceptDuration}</td>
                    <td style={td}>{r.acceptPassAt}</td>
                    <td style={td}>{r.deletedTargets}</td>
                    <td style={td}>{r.boxesAdded}</td>
                    <td style={td}>{r.boxesModified}</td>
                    <td style={td}>{r.boxesUntouched}</td>
                  </tr>
                ))}
                {autolabelRaw.length === 0 && (
                  <tr><td style={{ ...td, textAlign: 'center' }} colSpan={26}>暂无数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === '项目管理统计' && (
        <>
          <div style={panel}>
            <div style={panelTitle}>项目管理统计查询</div>
            <div style={filtersGrid}>
              <label style={label}>标注项目
                <input style={input} value={filters.labelProject} onChange={(e) => update('labelProject', e.target.value)} placeholder="如 道路元素/23D目标物" />
              </label>
              <div style={label}>送标批次（多选）
                <div style={dropdown}>
                  <button style={dropdownTrigger} onClick={() => update('batchesOpen', !(filters.batchesOpen))}>
                    {filters.batches.length ? `${filters.batches.length} 个已选` : '选择批次'}
                    <span style={{ marginLeft: 'auto', color: '#6b7280' }}>{filters.batchesOpen ? '▲' : '▼'}</span>
                  </button>
                  {filters.batchesOpen && (
                    <div style={dropdownPanel}>
                      {allBatches.map((b) => (
                        <label key={b} style={optionRow}>
                          <input type="checkbox" checked={filters.batches.includes(b)} onChange={() => toggleMulti('batches', b)} />
                          <span>{b}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <label style={label}>起始日期
                <input style={input} type="date" value={filters.startDate} onChange={(e) => update('startDate', e.target.value)} />
              </label>
              <label style={label}>结束日期
                <input style={input} type="date" value={filters.endDate} onChange={(e) => update('endDate', e.target.value)} />
              </label>
              <label style={label}>数据标签
                <input style={input} value={filters.tag} onChange={(e) => update('tag', e.target.value)} placeholder="如 车辆/行人" />
              </label>
              <label style={label}>优先级
                <select style={input} value={filters.priority} onChange={(e) => update('priority', e.target.value)}>
                  <option value="">全部</option>
                  {['高','中','低'].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={primaryBtn}>查询</button>
              <button style={btn} onClick={reset}>重置</button>
            </div>
          </div>

          <ProjectStatsTable filtered={filtered} batches={allBatches} />
        </>
      )}
    </div>
  )
}

function ProjectStatsTable({ filtered, batches }) {
  // 聚合到项目维度
  const byProject = {}
  filtered.forEach((r) => {
    const k = r.project
    if (!byProject[k]) byProject[k] = { totalSend: 0, labelQty: 0, reviewQty: 0, acceptQty: 0, batches: {} }
    // 定义“量”为 frames（也可换为 elements/clips，根据业务口径）
    const qty = r.frames || 0
    byProject[k].totalSend += qty
    if (r.role === '标注员') byProject[k].labelQty += qty
    if (r.role === '审核员') byProject[k].reviewQty += qty
    if (r.role === '验收员') byProject[k].acceptQty += qty
    const b = r.batch || '未知批次'
    const bStats = byProject[k].batches[b] || { totalSend: 0, labelQty: 0, reviewQty: 0, acceptQty: 0 }
    bStats.totalSend += qty
    if (r.role === '标注员') bStats.labelQty += qty
    if (r.role === '审核员') bStats.reviewQty += qty
    if (r.role === '验收员') bStats.acceptQty += qty
    byProject[k].batches[b] = bStats
  })

  const rows = Object.entries(byProject).map(([project, stats]) => {
    const pending = Math.max(0, stats.totalSend - stats.labelQty) // 待领取量（示意：总送标量-已标注量）
    return { project, totalSend: stats.totalSend, acceptQty: stats.acceptQty, pending, labelQty: stats.labelQty, reviewQty: stats.reviewQty, acceptStageQty: stats.acceptQty, batches: stats.batches }
  })

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['标注项目','总送标量','验收通过量','待领取量','标注环节量','审核环节量','验收环节量'].map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}
            <th style={th}>送标批次细节量</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`proj-${r.project}`}>
              <td style={td}>{r.project}</td>
              <td style={td}>{r.totalSend}</td>
              <td style={td}>{r.acceptQty}</td>
              <td style={td}>{r.pending}</td>
              <td style={td}>{r.labelQty}</td>
              <td style={td}>{r.reviewQty}</td>
              <td style={td}>{r.acceptStageQty}</td>
              <td style={td}>
                {Object.keys(r.batches).length ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['批次','总送标量','标注环节量','审核环节量','验收环节量'].map((h) => (
                          <th key={`${r.project}-batch-h-${h}`} style={{ ...th, padding: '6px 8px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(r.batches)
                        .sort((a, b) => b[1].totalSend - a[1].totalSend)
                        .map(([bName, s]) => (
                          <tr key={`proj-${r.project}-batch-${bName}`}>
                            <td style={{ ...td, padding: '6px 8px' }}>{bName}</td>
                            <td style={{ ...td, padding: '6px 8px' }}>{s.totalSend}</td>
                            <td style={{ ...td, padding: '6px 8px' }}>{s.labelQty}</td>
                            <td style={{ ...td, padding: '6px 8px' }}>{s.reviewQty}</td>
                            <td style={{ ...td, padding: '6px 8px' }}>{s.acceptQty}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <span style={{ color: '#9ca3af' }}>无批次数据</span>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td style={{ ...td, textAlign: 'center' }} colSpan={8}>暂无数据</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const panel = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }
const panelTitle = { fontWeight: 600 }
const filtersGrid = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(240px, 1fr))', gap: 12 }
const label = { display: 'flex', flexDirection: 'column', fontSize: 12, color: '#6b7280' }
const input = { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6 }
const multiRow = { display: 'flex', gap: 8, flexWrap: 'wrap' }
const chip = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f3f4f6', borderRadius: 999, padding: '4px 8px' }
const primaryBtn = { padding: '8px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }
const btn = { padding: '8px 10px', background: '#e5e7eb', color: '#111827', border: 'none', borderRadius: 6, cursor: 'pointer' }
const th = { textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb', fontWeight: 600 }
const td = { padding: 10, borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }
const tabBtn = { padding: '8px 10px', border: 'none', borderRadius: 6, cursor: 'pointer' }
// 下拉多选样式
const dropdown = { position: 'relative' }
const dropdownTrigger = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', width: '100%' }
const dropdownPanel = { position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: '240px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 16px rgba(0,0,0,0.06)', padding: 8, maxHeight: '220px', overflowY: 'auto', zIndex: 20 }
const optionRow = { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px' }