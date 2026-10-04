import React, { useEffect, useState } from 'react'
import api from '../api'

export default function DataSourcesPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncLog, setSyncLog] = useState(null)
  const [modeMessage, setModeMessage] = useState(null)

  const loadData = () => {
    api.dataSources()
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSyncMirror = async () => {
    setSyncing(true)
    setSyncLog(null)
    try {
      const res = await api.syncMirror()
      setSyncLog(res)
      loadData()
    } catch (err) {
      alert('Mirror sync failed: ' + err.message)
    } finally {
      setSyncing(false)
    }
  }

  const handleSwitchMode = async (mode) => {
    try {
      const res = await api.switchMode(mode)
      setModeMessage(res.message)
      loadData()
      window.setTimeout(() => setModeMessage(null), 4000)
    } catch (err) {
      alert('Mode switch failed: ' + err.message)
    }
  }

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
              data.mode === 'LIVE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              MODE: {data.mode} DATA ARCHITECTURE
            </span>
            <span className="text-xs font-mono text-slate-500">Nightly SRISHTI/DRISHTI Sync: ACTIVE</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">SRISHTI / DRISHTI Data Sources & Mirror Architecture</h1>
          <p className="text-sm text-slate-600">
            System connectors for DoLR Web-GIS layers, DRISHTI EXIF photo archives, Sentinel-2 rasters, and DEM elevation grids.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSyncMirror}
            disabled={syncing}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow transition flex items-center gap-2 disabled:opacity-50"
          >
            {syncing ? 'Syncing Mirror Job...' : '⚡ Run SRISHTI Mirror Sync Job'}
          </button>
          <div className="flex items-center bg-slate-100 p-1 rounded border border-slate-300 text-xs">
            <button
              onClick={() => handleSwitchMode('sample')}
              className="px-3 py-1 rounded font-semibold text-slate-700 hover:bg-white hover:shadow-xs"
            >
              Synthetic Sample
            </button>
            <button
              onClick={() => handleSwitchMode('real')}
              className="px-3 py-1 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700 shadow-xs"
            >
              Real Sentinel-2 (Ralegaon Siddhi)
            </button>
          </div>
        </div>
      </div>

      {modeMessage && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs rounded font-semibold">
          ✅ {modeMessage}
        </div>
      )}

      {syncLog && (
        <div className="bg-slate-900 text-emerald-400 p-4 rounded-lg font-mono text-xs space-y-1 border border-slate-800">
          <div className="font-bold text-white mb-1">=== NIGHTLY SRISHTI / DRISHTI MIRROR SYNC EXECUTED ===</div>
          <div>Status: {syncLog.status}</div>
          <div>Timestamp: {syncLog.timestamp}</div>
          <div>SRISHTI Watershed Boundaries Synced: {syncLog.srishti_watersheds_synced}</div>
          <div>SRISHTI Interventions Synced: {syncLog.srishti_interventions_synced}</div>
          <div>DRISHTI Field Photos Processed: {syncLog.drishti_photos_processed}</div>
          <div>EXIF GPS Verified Photos: {syncLog.exif_verified_photos}</div>
          <div>Flagged Photos (out-of-buffer/pre-construction): {syncLog.flagged_photos}</div>
          <div className="text-slate-400 mt-1">Source: {syncLog.mirror_source}</div>
        </div>
      )}

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
                {src.status}
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
                <span className="font-bold text-slate-800">{src.is_synthetic ? 'YES (Surrogate Data)' : 'NO (Real Data Ingested)'}</span>
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
