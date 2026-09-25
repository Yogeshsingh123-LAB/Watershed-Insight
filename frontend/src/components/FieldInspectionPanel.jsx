import React, { useEffect, useState } from 'react'
import api from '../api'

export default function FieldInspectionPanel({ watershedId }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [reason, setReason] = useState('')
  const [interId, setInterId] = useState('INT-CD-001')
  const [officer, setOfficer] = useState('Field_Officer_District')

  const fetchTasks = () => {
    setLoading(true)
    api.fieldInspections({ watershed_id: watershedId })
      .then((res) => {
        setTasks(res)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchTasks()
  }, [watershedId])

  const handleCreate = (e) => {
    e.preventDefault()
    if (!reason) return
    api.createFieldInspection({
      intervention_id: interId,
      watershed_id: watershedId,
      reason: reason,
      assigned_officer: officer,
      due_date: '2026-11-30',
      priority: 'HIGH'
    }).then(() => {
      setReason('')
      setShowCreate(false)
      fetchTasks()
    }).catch(console.error)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Field Inspection Workflows</h1>
          <p className="text-sm text-slate-600">
            Issue inspection tasks to field officers, submit geo-coded evidence, and trigger evidence health recalculations.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-[#0f3a61] hover:bg-[#0c2f50] text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm"
        >
          {showCreate ? 'Cancel' : '+ Request Field Inspection'}
        </button>
      </div>

      {/* Create Modal Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Issue New Field Inspection Task</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Structure ID</label>
              <input
                type="text"
                value={interId}
                onChange={(e) => setInterId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Officer</label>
              <input
                type="text"
                value={officer}
                onChange={(e) => setOfficer(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Reason for Inspection</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Siltation check required"
                className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-sm"
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs px-4 py-2 rounded shadow-sm">
              Dispatch Task
            </button>
          </div>
        </form>
      )}

      {/* Task List */}
      {loading && <div className="p-8 text-center text-slate-600 font-medium">Loading inspection tasks...</div>}

      {!loading && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Active Field Inspection Tasks</h2>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="border border-slate-200 rounded-md p-4 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-800 px-2 py-0.5 rounded">{task.id}</span>
                    <span className="text-xs font-semibold text-slate-800">Structure: {task.intervention_id}</span>
                    <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded">{task.status}</span>
                  </div>
                  <p className="text-xs text-slate-700 font-sans"><strong className="text-slate-900">Reason:</strong> {task.reason}</p>
                  <p className="text-xs text-slate-500 font-mono">Assigned to: {task.assigned_officer} | Due: {task.due_date}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      api.updateFieldInspection(task.id, { status: 'SUBMITTED', field_notes: 'Evidence submitted by field officer.' })
                        .then(() => fetchTasks())
                    }}
                    className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded shadow-sm"
                  >
                    Submit Evidence
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
