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

import DecisionCenterPanel from './components/DecisionCenterPanel'
import BeforeAfterPanel from './components/BeforeAfterPanel'
import EvidenceHealthPanel from './components/EvidenceHealthPanel'
import DataSourcesPanel from './components/DataSourcesPanel'
import FieldInspectionPanel from './components/FieldInspectionPanel'
import AuditTrailPanel from './components/AuditTrailPanel'
import AiAssistantModal from './components/AiAssistantModal'
import LoginModal from './components/LoginModal'

import LandingPage from './components/LandingPage'
import LoginPage from './components/LoginPage'
import ForbiddenPage from './components/ForbiddenPage'
import AdminPortal from './components/AdminPortal'
import VerificationPortal from './components/VerificationPortal'
import AuditorPortal from './components/AuditorPortal'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'explorer', label: 'Watershed Explorer' },
  { id: 'interventions', label: 'Interventions' },
  { id: 'change', label: 'Change Analysis' },
  { id: 'fieldevidence', label: 'Field Evidence' },
  { id: 'impact', label: 'Impact Assessment' },
  { id: 'decision', label: 'Decision Center' },
  { id: 'reports', label: 'Reports' },
  { id: 'audit', label: 'Audit Trail' },
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
  // --- routing & view state ('landing' | 'login' | 'app') -------------------- //
  const [routeView, setRouteView] = useState('landing')

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
  const [tab, setTab] = useState('dashboard')
  const [selectedId, setSelectedId] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [catchment, setCatchment] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  // --- user authentication state ----------------------------------------- //
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('watershed_officer_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })


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

  const handleLoginSuccess = (userObj, targetPortal = '/app/officer') => {
    setCurrentUser(userObj)
    try {
      localStorage.setItem('watershed_officer_user', JSON.stringify(userObj))
    } catch {}
    notify(`Authenticated as ${userObj.name} (${userObj.roleTitle || userObj.role})`, 'success')
    setRouteView('app')
  }

  const handleLogout = () => {
    setCurrentUser(null)
    try {
      localStorage.removeItem('watershed_officer_user')
    } catch {}
    setRouteView('landing')
    notify('Logged out of session.', 'info')
  }

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

  // 1. PUBLIC LANDING PAGE
  if (routeView === 'landing') {
    return (
      <LandingPage
        onLoginClick={() => setRouteView('login')}
        onExploreClick={() => {
          if (currentUser) setRouteView('app')
          else setRouteView('login')
        }}
      />
    )
  }

  // 2. DEDICATED LOGIN PAGE
  if (routeView === 'login') {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onBackToHome={() => setRouteView('landing')}
      />
    )
  }

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

  // 3. AUTHENTICATED ROLE PORTALS
  const role = currentUser?.role || 'DISTRICT_OFFICER'

  // SUPER ADMIN PORTAL
  if (role === 'ADMIN') {
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
          currentUser={currentUser}
          onOpenLogin={() => setRouteView('login')}
          onLogout={handleLogout}
        />
        <div className="flex-1 overflow-y-auto bg-[#070d19]">
          <AdminPortal currentUser={currentUser} />
        </div>
      </div>
    )
  }

  // VERIFICATION OFFICER PORTAL
  if (role === 'FIELD_OFFICER') {
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
          currentUser={currentUser}
          onOpenLogin={() => setRouteView('login')}
          onLogout={handleLogout}
        />
        <div className="flex-1 overflow-y-auto bg-[#070d19]">
          <VerificationPortal currentUser={currentUser} />
        </div>
      </div>
    )
  }

  // AUDITOR PORTAL
  if (role === 'AUDITOR') {
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
          currentUser={currentUser}
          onOpenLogin={() => setRouteView('login')}
          onLogout={handleLogout}
        />
        <div className="flex-1 overflow-y-auto bg-[#070d19]">
          <AuditorPortal currentUser={currentUser} />
        </div>
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
        currentUser={currentUser}
        onOpenLogin={() => setRouteView('login')}
        onLogout={handleLogout}
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

          <div className="tab-content overflow-y-auto">
            {(tab === 'dashboard' || tab === 'overview') && (
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
            {(tab === 'explorer' || tab === 'thematic') && (
              <ThematicPanel
                summary={summary}
                layers={layers}
                setLayers={setLayers}
                onToggleCatchment={toggleCatchment}
                catchment={catchment}
                selectedId={selectedId}
              />
            )}
            {tab === 'interventions' && (
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
            {(tab === 'change' || tab === 'beforeafter') && (
              <div className="space-y-6">
                <BeforeAfterPanel
                  watershedId={watershedId}
                  interventions={interventions}
                />
                <ChangePanel
                  summary={summary}
                  watershedId={watershedId}
                  epochKey={epochKey}
                  setEpochKey={setEpochKey}
                  epochs={epochs}
                />
              </div>
            )}
            {(tab === 'fieldevidence' || tab === 'inspections' || tab === 'photos') && (
              <div className="space-y-6">
                <FieldInspectionPanel
                  watershedId={watershedId}
                />
                <PhotosPanel
                  watershedId={watershedId}
                  summary={summary}
                  selectedId={selectedId}
                  onSelect={(id) => selectIntervention(id, { open: true })}
                  onFly={(p) => setFocus({ lat: Number(p.latitude), lon: Number(p.longitude), zoom: 17, key: Date.now() })}
                  notify={notify}
                />
              </div>
            )}
            {(tab === 'impact' || tab === 'evidence') && (
              <EvidenceHealthPanel
                watershedId={watershedId}
                interventions={interventions}
              />
            )}
            {tab === 'decision' && (
              <DecisionCenterPanel
                watershedId={watershedId}
                onSelectIntervention={(id) => selectIntervention(id, { open: true })}
                onOpenAi={() => setAiModalOpen(true)}
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
            {tab === 'audit' && (
              <AuditTrailPanel />
            )}
          </div>
        </div>
      </div>

      <AiAssistantModal
        watershedId={watershedId}
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
      />

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={(u) => {
          setCurrentUser(u)
          try {
            localStorage.setItem('watershed_officer_user', JSON.stringify(u))
          } catch {}
          notify(`Authenticated as ${u.name} (${u.roleTitle || u.role})`, 'success')
        }}
      />


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

      {/* Official Government System Footer Status Bar */}
      <footer className="h-7 min-h-[28px] bg-[#070d19] border-t border-slate-800/80 px-4 flex items-center justify-between text-[11px] text-slate-400 z-[1200]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            SRISHTI-DRISHTI ENGINE: ACTIVE
          </span>
          <span className="text-slate-700">•</span>
          <span className="text-slate-300 font-medium">Department of Land Resources • Ministry of Rural Development • Govt. of India</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-slate-400">
          <span className="bg-slate-800/90 text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider">OFFICIAL USE ONLY</span>
          <span className="text-slate-700">•</span>
          <span className="font-mono text-[10px]">EPSG:4326 (WGS 84)</span>
        </div>
      </footer>
    </div>
  )
}
