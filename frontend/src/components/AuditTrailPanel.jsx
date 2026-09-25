import React, { useEffect, useState } from 'react'
import api from '../api'

export default function AuditTrailPanel() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.auditLogs()
      .then((res) => {
        setLogs(res)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Government Audit Trail</h1>
          <p className="text-sm text-slate-600">
            Immutable log of all user operations, analysis execution, decision overrides, and report generation events.
          </p>
        </div>
      </div>

      {loading && <div className="p-8 text-center text-slate-600 font-medium">Loading Audit Trail logs...</div>}

      {!loading && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="p-3">Audit ID / Time</th>
                <th className="p-3">User &amp; Role</th>
                <th className="p-3">Action</th>
                <th className="p-3">Target Entity</th>
                <th className="p-3">Result / Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{log.id}</div>
                    <div className="text-[10px] text-slate-400">{log.timestamp}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-800">{log.user_id}</div>
                    <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{log.role}</span>
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-[#0f3a61]">{log.action}</span>
                  </td>
                  <td className="p-3">
                    <span className="text-slate-800 font-medium">{log.entity}</span> ({log.entity_id})
                  </td>
                  <td className="p-3">
                    <div className="text-slate-900">{log.new_value || 'Executed'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
