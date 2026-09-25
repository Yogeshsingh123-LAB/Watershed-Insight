import React, { useEffect, useState } from 'react'
import api from '../api'

export default function BeforeAfterPanel({ watershedId, interventions = [] }) {
  const [selectedId, setSelectedId] = useState('')
  const [bundle, setBundle] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sliderPos, setSliderPos] = useState(50)

  useEffect(() => {
    if (interventions.length > 0 && !selectedId) {
      const first = interventions[0].id || (interventions[0].properties && interventions[0].properties.id)
      if (first) setSelectedId(first)
    }
  }, [interventions])

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    setError(null)
    api.beforeAfter(selectedId)
      .then((data) => {
        setBundle(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [selectedId])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Before / After Analysis</h1>
          <p className="text-sm text-slate-600">
            Compare baseline pre-implementation satellite observations with post-implementation outcomes for any structure.
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

      {loading && <div className="p-8 text-center text-slate-600 font-medium">Loading Before/After metrics...</div>}
      {error && <div className="p-8 text-center text-red-600 font-medium">Error: {error}</div>}

      {bundle && !loading && (
        <div className="space-y-6">
          {/* Comparison Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* BEFORE Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">BEFORE (Baseline)</span>
                <span className="text-xs font-mono font-semibold text-slate-700">{bundle.t0_date}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Mean NDVI:</span>
                  <span className="font-mono font-semibold text-slate-800">{bundle.before_metrics.ndvi_mean.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Land-Only NDVI:</span>
                  <span className="font-mono font-semibold text-slate-800">{bundle.before_metrics.ndvi_land.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Surface Water Area:</span>
                  <span className="font-mono font-semibold text-slate-800">{bundle.before_metrics.water_area_ha.toFixed(2)} ha</span>
                </div>
              </div>
            </div>

            {/* AFTER Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">AFTER (Recent)</span>
                <span className="text-xs font-mono font-semibold text-emerald-800">{bundle.t1_date}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Mean NDVI:</span>
                  <span className="font-mono font-semibold text-slate-800">{bundle.after_metrics.ndvi_mean.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Land-Only NDVI:</span>
                  <span className="font-mono font-semibold text-slate-800">{bundle.after_metrics.ndvi_land.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Surface Water Area:</span>
                  <span className="font-mono font-semibold text-slate-800">{bundle.after_metrics.water_area_ha.toFixed(2)} ha</span>
                </div>
              </div>
            </div>

            {/* CHANGE Card */}
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-emerald-200 pb-2">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">MEASURED NET CHANGE</span>
                <span className="text-xs font-semibold text-emerald-700">250m Buffer</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-700">
                  <span>Δ NDVI (Land Only):</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {bundle.change_metrics.ndvi_change_land > 0 ? '+' : ''}{bundle.change_metrics.ndvi_change_land.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Δ Water Area:</span>
                  <span className="font-mono font-bold text-blue-800">
                    {bundle.change_metrics.water_change_ha > 0 ? '+' : ''}{bundle.change_metrics.water_change_ha.toFixed(2)} ha
                  </span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Buffer Improved:</span>
                  <span className="font-mono font-bold text-emerald-800">{bundle.change_metrics.improved_pct.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Visual Overlay Comparison */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">Synchronized Satellite Overlay Comparison</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-md p-3 text-center space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase">Baseline NDVI Overlay ({bundle.t0_date})</div>
                <img src={bundle.satellite_overlays.before_ndvi} alt="Before NDVI" className="w-full h-64 object-contain rounded bg-slate-900" />
              </div>
              <div className="border border-slate-200 rounded-md p-3 text-center space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase">Recent NDVI Overlay ({bundle.t1_date})</div>
                <img src={bundle.satellite_overlays.after_ndvi} alt="After NDVI" className="w-full h-64 object-contain rounded bg-slate-900" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
