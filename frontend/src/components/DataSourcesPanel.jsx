import React, { useEffect, useState } from 'react'
import api from '../api'

export default function DataSourcesPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.dataSources()
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="p-8 text-center text-slate-600 font-medium">Loading Data Source Integration Status...</div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded ${
              data.mode === 'LIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              MODE: {data.mode} DATA
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">SRISHTI / DRISHTI Data Sources Architecture</h1>
          <p className="text-sm text-slate-600">
            System connectors for government GIS layers, field photo archives, satellite rasters, and terrain DEMs.
          </p>
        </div>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.sources.map((src) => (
          <div key={src.id} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{src.type}</span>
                <h2 className="text-lg font-bold text-slate-900">{src.name}</h2>
              </div>
              <span className={`text-xs font-bold uppercase px-3 py-1 rounded ${
                src.status === 'CONNECTED'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {src.status === 'DEMO_DATA' ? 'DEMO / SYNTHETIC DATA' : src.status}
              </span>
            </div>

            <p className="text-sm text-slate-600 font-sans">{src.description}</p>

            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-1 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Items Indexed:</span>
                <span className="font-bold text-slate-800">{src.item_count}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Synthetic Flag:</span>
                <span className="font-bold text-slate-800">{src.is_synthetic ? 'YES (Surrogate Data)' : 'NO (Live Data)'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Last Synchronized:</span>
                <span className="font-bold text-slate-800">{src.last_synced}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
