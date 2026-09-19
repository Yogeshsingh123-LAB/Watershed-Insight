import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'

import api from './api'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import MapView from './components/MapView'
import OverviewPanel from './components/OverviewPanel'
import ChangePanel from './components/ChangePanel'
import PhotosPanel from './components/PhotosPanel'
import ThematicPanel from './components/ThematicPanel'
import ReportsPanel from './components/ReportsPanel'
import InterventionModal from './components/InterventionModal'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'change', label: 'Change' },
  { id: 'photos', label: 'Photos' },
  { id: 'thematic', label: 'Thematic' },
  { id: 'reports', label: 'Reports' },
]

const DEFAULT_LAYERS = {
  boundary: true,
  interventions: true,
  photos: true,
  streams: true,
  buffers: true,
  hillshade: false,
  ndvi: true,
  ndwi: false,
  lulc: false,
  delta: false,
  slope: false,
  catchment: false,
  hotspots: false,
}

export default function App() {
  // --- catalog / selection ------------------------------------------------ //
  const [catalog, setCatalog] = useState(null)
  const [watershedId, setWatershedId] = useState(null)
  const [summary, setSummary] = useState(null)
  const [overlays, setOverlays] = useState(null)

  // --- map state ---------------------------------------------------------- //
  const [layers, setLayers] = useState(DEFAULT_LAYERS)
  const [basemap, setBasemap] = useState('satellite')
  const [epochKey, setEpochKey] = useState(null)       // null -> latest (T1)
  const [radius, setRadius] = useState(250)
  const [opacity, setOpacity] = useState(0.75)
  const [types, setTypes] = useState([])               // intervention type filter
  const [focus, setFocus] = useState(null)             // {lat, lon, zoom} request

  // --- detail state ------------------------------------------------------- //
  const [tab, setTab] = useState('overview')
  const [selectedId, setSelectedId] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [catchment, setCatchment] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  // --- ui state ----------------------------------------------------------- //
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const healthRef = useRef({ status: 'online' })

  const notify = useCallback((message, kind = 'info') => {
    setToast({ message, kind })
    window.setTimeout(() => setToast(null), 4200)
  }, [])

  // --------------------------------------------------------------------- //
  // Boot: catalog -> first watershed
  // --------------------------------------------------------------------- //
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [cat, health] = await Promise.all([api.catalog(), api.health().catch(() => null)])
        if (cancelled) return
        healthRef.current = health || { status: 'unknown' }
        setCatalog(cat)
        const firstId = cat?.watersheds ? Object.keys(cat.watersheds)[0] : null
        if (firstId) setWatershedId(firstId)
        else setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to reach the Watershed Insight API.')
          setLoading(false)
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  // --------------------------------------------------------------------- //
  // Load the selected watershed
  // --------------------------------------------------------------------- //
  useEffect(() => {
    if (!watershedId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const [sum, ov] = await Promise.all([
          api.summary(watershedId),
          api.overlays(watershedId).catch(() => null),
        ])
        if (cancelled) return
        setSummary(sum)
        setOverlays(ov)
        setEpochKey(null)
        setSelectedId(null)
        setAnalysis(null)
        setCatchment(null)

        const centre = sum?.watershed?.centre
        if (centre) setFocus({ lat: centre[0], lon: centre[1], zoom: 14, key: Date.now() })

        // Auto-select the best-performing structure as the showcase.
        const top = sum?.ranking?.[0]
        if (top) selectIntervention(top.id, { silent: true })
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load the watershed dataset.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watershedId])

  // --------------------------------------------------------------------- //
  // Overlays follow the selected epoch / opacity
  // --------------------------------------------------------------------- //
  useEffect(() => {
    if (!watershedId) return
    let cancelled = false
    api.overlays(watershedId, { epoch: epochKey || undefined, alpha: opacity })
      .then((ov) => { if (!cancelled) setOverlays(ov) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [watershedId, epochKey, opacity])

  // --------------------------------------------------------------------- //
  // Intervention selection
  // --------------------------------------------------------------------- //
  const selectIntervention = useCallback(async (id, { silent = false, open = false } = {}) => {
    if (!id) return
    setSelectedId(id)
    setBusy(true)
    try {
      const data = await api.analysis(id, radius)
      setAnalysis(data)
      if (open) setModalOpen(true)
      const item = data.intervention
      setFocus({ lat: item.latitude, lon: item.longitude, zoom: 15, key: Date.now() })
      if (layers.catchment) {
        api.catchment(id).then(setCatchment).catch(() => setCatchment(null))
      } else {
        setCatchment(null)
      }
      if (!silent) setTab('overview')
    } catch (err) {
      notify(err.message || 'Analysis failed', 'error')
    } finally {
      setBusy(false)
    }
  }, [radius, layers.catchment, notify])

  useEffect(() => {
    if (selectedId) selectIntervention(selectedId, { silent: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius])

  const toggleCatchment = useCallback((on) => {
    setLayers((prev) => ({ ...prev, catchment: on }))
    if (on && selectedId) {
      api.catchment(selectedId).then(setCatchment).catch(() => setCatchment(null))
    } else {
      setCatchment(null)
    }
  }, [selectedId])

  // --------------------------------------------------------------------- //
  // Reports
  // --------------------------------------------------------------------- //
  const downloadReport = useCallback(async (kind, id) => {
    if (!id) return
    setBusy(true)
    try {
      const res = await api.reportDownload(kind, id, kind === 'intervention' ? radius : undefined)
      const filename =
        (res.headers?.['content-disposition'] || '').split('filename=')[1]?.replace(/"/g, '') ||
        `${kind === 'intervention' ? 'EvidencePack' : 'WatershedAssessment'}_${id}.pdf`
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
      notify('PDF evidence document generated.', 'success')
    } catch (err) {
      notify(err.message || 'PDF generation failed', 'error')
    } finally {
      setBusy(false)
    }
  }, [radius, notify])

  // --------------------------------------------------------------------- //
  // Derived data
  // --------------------------------------------------------------------- //
  const interventions = useMemo(() => {
    const feats = summary?.interventions?.features || []
    return feats
      .map((f) => f.properties)
      .filter((p) => (types.length ? types.includes(p.type) : true))
  }, [summary, types])

  const epochs = useMemo(() => summary?.epochs || [], [summary])

  if (error) {
    return (
      <div className="error-screen">
        <AlertTriangle size={38} color="#f87171" />
        <h2>Cannot reach the analysis engine</h2>
        <p>{error}</p>
        <p>
          Start the FastAPI backend and reload:
          <br />
          <code>python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000</code>
          <br />
          If the dataset is missing, run: <code>python scripts/generate_sample_data.py</code>
        </p>
      </div>
    )
  }

  if (loading && !summary) {
    return (
      <div className="loader-screen">
        <Loader2 className="spinner" size={36} />
        <div>Loading micro-watershed intelligence…</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Navbar
        catalog={catalog}
        watershedId={watershedId}
        onSelectWatershed={setWatershedId}
        summary={summary}
        health={healthRef.current}
        busy={busy || loading}
        onGenerateReport={() => downloadReport('watershed', watershedId)}
      />

      <div className="dashboard-grid">
        <Sidebar
          summary={summary}
          layers={layers}
          setLayers={setLayers}
          basemap={basemap}
          setBasemap={setBasemap}
          epochs={epochs}
          epochKey={epochKey}
          setEpochKey={setEpochKey}
          radius={radius}
          setRadius={setRadius}
          opacity={opacity}
          setOpacity={setOpacity}
          types={types}
          setTypes={setTypes}
          onToggleCatchment={toggleCatchment}
        />

        <MapView
          summary={summary}
          overlays={overlays}
          layers={layers}
          basemap={basemap}
          interventions={interventions}
          photos={summary?.photos}
          selectedId={selectedId}
          onSelect={selectIntervention}
          focus={focus}
          radius={radius}
          opacity={opacity}
          catchment={layers.catchment ? catchment : null}
          hotspots={summary?.hotspots}
          loading={loading}
        />

        <div className="analytics-panel">
          <div className="tab-bar">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`tab-btn ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="tab-content">
            {tab === 'overview' && (
              <OverviewPanel
                summary={summary}
                analysis={analysis}
                onSelect={(id) => selectIntervention(id, { open: true })}
                onFly={(item) => setFocus({ lat: item.latitude, lon: item.longitude, zoom: 16, key: Date.now() })}
                onReport={() => downloadReport('intervention', selectedId)}
                busy={busy}
                radius={radius}
              />
            )}
            {tab === 'change' && (
              <ChangePanel
                summary={summary}
                watershedId={watershedId}
                epochKey={epochKey}
                setEpochKey={setEpochKey}
                epochs={epochs}
              />
            )}
            {tab === 'photos' && (
              <PhotosPanel
                watershedId={watershedId}
                summary={summary}
                selectedId={selectedId}
                onSelect={(id) => selectIntervention(id, { open: true })}
                onFly={(p) => setFocus({ lat: Number(p.latitude), lon: Number(p.longitude), zoom: 17, key: Date.now() })}
                notify={notify}
              />
            )}
            {tab === 'thematic' && (
              <ThematicPanel
                summary={summary}
                layers={layers}
                setLayers={setLayers}
                onToggleCatchment={toggleCatchment}
                catchment={catchment}
                selectedId={selectedId}
              />
            )}
            {tab === 'reports' && (
              <ReportsPanel
                watershedId={watershedId}
                summary={summary}
                selectedId={selectedId}
                radius={radius}
                onDownload={downloadReport}
                busy={busy}
              />
            )}
          </div>
        </div>
      </div>

      {modalOpen && analysis && (
        <InterventionModal
          data={analysis}
          radius={radius}
          onClose={() => setModalOpen(false)}
          onReport={() => downloadReport('intervention', analysis.intervention.id)}
          busy={busy}
        />
      )}

      {toast && (
        <div className={`toast ${toast.kind === 'error' ? 'error' : toast.kind === 'success' ? 'success' : ''}`}>
          {toast.kind === 'error' ? <AlertTriangle size={15} /> : null}
          {toast.message}
        </div>
      )}
    </div>
  )
}
