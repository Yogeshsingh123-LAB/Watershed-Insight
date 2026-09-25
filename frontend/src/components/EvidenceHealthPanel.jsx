import React, { useEffect, useState } from 'react'
import api from '../api'

export default function EvidenceHealthPanel({ watershedId, interventions = [] }) {
  const [selectedId, setSelectedId] = useState('')
  const [healthData, setHealthData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (interventions.length > 0 && !selectedId) {
      const first = interventions[0].id || (interventions[0].properties && interventions[0].properties.id)
      if (first) setSelectedId(first)
    }
  }, [interventions])

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    api.evidenceHealth(selectedId)
      .then((data) => {
        setHealthData(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [selectedId])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Evidence Health & Audit Validation</h1>
          <p className="text-sm text-slate-600">
            Inspect data quality checks, EXIF GPS compliance, cloud masking, and baseline controls for audit-ready compliance.
          </p>
        </div>
        <div className="w-full md:w-72">
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Select Structure</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-md p-2 font-medium"
          >
            {interventions.map((item) => {
              const id = item.id || (item.properties && item.properties.id)
              const name = item.name || (item.properties && item.properties.name) || id
              return <option key={id} value={id}>{name} ({id})</option>
            })}
          </select>
        </div>
      </div>

      {loading && <div className="p-8 text-center text-slate-600 font-medium">Checking Evidence Health parameters...</div>}

      {healthData && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Health Score Overview */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4 md:col-span-1">
            <h2 className="text-base font-bold text-slate-900">Health Score & Status</h2>
            <div className="text-center py-6 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-4xl font-extrabold text-[#0f3a61]">{healthData.health_score} / 100</div>
              <div className="mt-2 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 inline-block px-3 py-1 rounded">
                STATUS: {healthData.status_label}
              </div>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Officer Recommendation:</p>
              <p className="bg-slate-50 border border-slate-200 p-3 rounded text-slate-700 font-sans">{healthData.recommendation}</p>
            </div>
          </div>

          {/* Validation Checklist */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4 md:col-span-2">
            <h2 className="text-base font-bold text-slate-900">Evidence Validation Checklist</h2>
            <div className="space-y-3">
              {healthData.checks.map((check) => (
                <div
                  key={check.key}
                  className={`border rounded-md p-3.5 flex items-start gap-3 ${
                    check.passed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'
                  }`}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    check.passed ? 'bg-emerald-600' : 'bg-amber-600'
                  }`}>
                    {check.passed ? '✓' : '!'}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900">{check.label}</div>
                    <div className="text-xs text-slate-600 font-sans">{check.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
