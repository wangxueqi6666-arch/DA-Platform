import React, { useMemo, useState } from 'react'

export default function TruthQuery() {
  const [form, setForm] = useState({
    taskType: '23D目标物',
    dataType: '新标注数据',
    plate: '',
    label: '',
    person: '',
    clipName: '',
    imageQuery: '',
    textQuery: '',
  })

  const results = useMemo(() => ([
    { id: 'R1', clip: 'clip_0001', capturedAt: '2024-09-10 10:25', labeledAt: '2024-10-02 12:10', reviewedAt: '2024-10-03 14:30', acceptedAt: '2024-10-04 09:20', vizUrl: 'https://viz.example/clip_0001', fileUrl: '/data/clip_0001' },
    { id: 'R2', clip: 'clip_0002', capturedAt: '2024-09-12 08:15', labeledAt: '2024-10-05 11:20', reviewedAt: '2024-10-06 13:05', acceptedAt: '2024-10-07 10:10', vizUrl: 'https://viz.example/clip_0002', fileUrl: '/data/clip_0002' },
  ]), [])

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const exportCSV = () => {
    const headers = ['clip name','采集时间','标注时间','审核时间','验收时间','可视化地址','文件地址']
    const rows = results.map((r) => [r.clip, r.capturedAt, r.labeledAt, r.reviewedAt, r.acceptedAt, r.vizUrl, r.fileUrl])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '真值查询结果.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('已复制到剪贴板')
    } catch (_) {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      alert('已复制到剪贴板')
    }
  }

  const viewData = (id) => {
    alert(`查看数据：${id}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={panel}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <label style={label}>标注任务类型
            <select style={input} value={form.taskType} onChange={(e) => update('taskType', e.target.value)}>
              <option>23D目标物</option>
              <option>OCC</option>
            </select>
          </label>
          <label style={label}>数据类型
            <select style={input} value={form.dataType} onChange={(e) => update('dataType', e.target.value)}>
              <option>新标注数据</option>
              <option>预标注任务</option>
              <option>重标注任务</option>
            </select>
          </label>
          <label style={label}>车牌号
            <input style={input} value={form.plate} onChange={(e) => update('plate', e.target.value)} placeholder="如 沪A12345" />
          </label>
          <label style={label}>标签查询
            <input style={input} value={form.label} onChange={(e) => update('label', e.target.value)} placeholder="如 车辆/行人" />
          </label>
          <label style={label}>标注员/审核员/验收员
            <input style={input} value={form.person} onChange={(e) => update('person', e.target.value)} placeholder="输入姓名" />
          </label>
          <label style={label}>clip name
            <input style={input} value={form.clipName} onChange={(e) => update('clipName', e.target.value)} placeholder="如 clip_0001" />
          </label>
          <label style={label}>图搜图输入框
            <input style={input} value={form.imageQuery} onChange={(e) => update('imageQuery', e.target.value)} placeholder="输入图片URL或关键字" />
          </label>
          <label style={label}>文搜图输入框
            <input style={input} value={form.textQuery} onChange={(e) => update('textQuery', e.target.value)} placeholder="输入文本关键词" />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button style={primaryBtn}>查询</button>
          <button style={btn} onClick={exportCSV}>导出</button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
        <thead>
          <tr>
            {['clip name', '采集时间', '标注时间', '审核时间', '验收时间', '操作'].map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.id}>
              <td style={td}>{r.clip}</td>
              <td style={td}>{r.capturedAt}</td>
              <td style={td}>{r.labeledAt}</td>
              <td style={td}>{r.reviewedAt}</td>
              <td style={td}>{r.acceptedAt}</td>
              <td style={td}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={btn} onClick={() => viewData(r.id)}>查看数据</button>
                  <button style={btn} onClick={() => copy(r.vizUrl)}>复制可视化地址</button>
                  <button style={btn} onClick={() => copy(r.fileUrl)}>复制文件地址</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const panel = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }
const label = { display: 'flex', flexDirection: 'column', fontSize: 12, color: '#6b7280' }
const input = { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6 }
const th = { textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb', fontWeight: 600 }
const td = { padding: 10, borderBottom: '1px solid #f3f4f6' }
const btn = { padding: '6px 10px', border: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: 6, cursor: 'pointer' }
const primaryBtn = { padding: '6px 10px', border: 'none', background: '#2563eb', color: '#fff', borderRadius: 6, cursor: 'pointer' }
