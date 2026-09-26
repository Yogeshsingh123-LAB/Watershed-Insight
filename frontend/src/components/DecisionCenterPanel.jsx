import React, { useEffect, useState } from 'react'
import api from '../api'

export default function DecisionCenterPanel({ watershedId, onSelectIntervention, onOpenAi }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!watershedId) return
    setLoading(true)
    api.decisionSummary(watershedId)
      .then((res) => {
        setSummary(res)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [watershedId])

  if (loading) {
    return <div className="p-8 text-center text-slate-600 font-medium">Loading Watershed Decision Center...</div>
  }

  if (error || !summary) {
    return <div className="p-8 text-center text-red-600 font-medium">Error loading decision summary: {error}</div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded">
              Government Decision Support
            </span>
            <span className="text-xs text-slate-500 font-medium">Department of Land Resources • Govt. of India</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{summary.watershed_name} — Decision Center</h1>
          <p className="text-sm text-slate-600">
            Executive summary of measured structure outcomes, evidence confidence, and action recommendations.
          </p>
        </div>
        <button
          onClick={onOpenAi}
          className="flex items-center gap-2 bg-[#0f3a61] hover:bg-[#0c2f50] text-white px-4 py-2.5 rounded-md font-medium text-sm transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Ask DharaScan AI
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500 uppercase">Watershed Health</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{summary.overall_health}</div>
          <div className="text-xs text-slate-400 mt-1">Based on spectral deltas</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500 uppercase">Structures Assessed</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{summary.total_structures}</div>
          <div className="text-xs text-slate-400 mt-1">SRISHTI inventory</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500 uppercase">High Impact</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{summary.high_impact_count}</div>
          <div className="text-xs text-slate-400 mt-1">Score ≥ 60 / 100</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500 uppercase">Moderate Impact</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{summary.moderate_impact_count}</div>
          <div className="text-xs text-slate-400 mt-1">Score 45–59 / 100</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500 uppercase">Field Inspection Required</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{summary.inspection_required_count}</div>
          <div className="text-xs text-slate-400 mt-1">Score &lt; 45 / 100</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500 uppercase">Average Impact</div>
          <div className="text-2xl font-bold text-[#0f3a61] mt-1">{summary.average_impact_score}</div>
          <div className="text-xs text-slate-400 mt-1">Composite score</div>
        </div>
      </div>

      {/* Action Queue */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Officer Action Queue</h2>
            <p className="text-xs text-slate-500">
              Prioritised recommended actions based on deterministic geospatial analysis and evidence confidence.
            </p>
          </div>
          <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 font-medium px-2.5 py-1 rounded">
            {summary.action_queue.length} Actions Pending
          </span>
        </div>

        {summary.action_queue.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No immediate officer actions required. All structures meet impact thresholds.
          </div>
        ) : (
          <div className="space-y-3">
            {summary.action_queue.map((item) => (
              <div
                key={item.id}
                className="border border-slate-200 hover:border-slate-300 rounded-md p-4 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      item.priority === 'HIGH' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.priority} PRIORITY
                    </span>
                    <span className="text-xs font-semibold text-slate-700">{item.structure_type}</span>
                    <span className="text-xs text-slate-400">({item.intervention_id})</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                  <p className="text-xs text-slate-600 font-sans">
                    <strong className="text-slate-800">WHY:</strong> {item.reason_why}
                  </p>
                  <p className="text-xs font-mono text-slate-500">{item.evidence_summary}</p>
                </div>

                <button
                  onClick={() => onSelectIntervention && onSelectIntervention(item.intervention_id)}
                  className="whitespace-nowrap bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
                >
                  Review Intervention
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
