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
import PublicPortal from './components/PublicPortal'
import ForbiddenPage from './components/ForbiddenPage'
import AdminPortal from './components/AdminPortal'
import VerificationPortal from './components/VerificationPortal'
import AuditorPortal from './components/AuditorPortal'
import OfficerPortal from './components/OfficerPortal'

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

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="modal-overlay" onClick={() => this.setState({ hasError: false })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: 24, textAlign: 'center', maxWidth: 480 }}>
            <AlertTriangle size={32} color="#f87171" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontWeight: 700, color: '#0f172a' }}>Modal Render Notice</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '8px 0 16px' }}>
              {this.state.error?.message || 'Unable to display structure evidence details.'}
            </p>
            <button
              className="btn btn-primary"
              onClick={() => this.setState({ hasError: false })}
            >
              Close Window
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
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
          setError(err.message || 'Unable to reach the DharaScan API.')
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

  const role = currentUser?.role || 'DISTRICT_OFFICER'

  let mainContent = null

  // 1. PUBLIC LANDING PAGE
  if (routeView === 'landing') {
    mainContent = (
      <LandingPage
        onLoginClick={() => setRouteView('login')}
        onExploreClick={() => setRouteView('public')}
      />
    )
  }
  // 2. DEDICATED LOGIN PAGE
  else if (routeView === 'login') {
    mainContent = (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onBackToHome={() => setRouteView('landing')}
      />
    )
  }
  // 3. PUBLIC USER CITIZEN PORTAL
  else if (routeView === 'public') {
    mainContent = (
      <PublicPortal
        catalog={catalog}
        watershedId={watershedId}
        onSelectWatershed={setWatershedId}
        summary={summary}
        overlays={overlays}
        layers={layers}
        setLayers={setLayers}
        basemap={basemap}
        setBasemap={setBasemap}
        interventions={interventions}
        photos={summary?.photos}
        selectedId={selectedId}
        selectIntervention={selectIntervention}
        focus={focus}
        radius={radius}
        opacity={opacity}
        catchment={layers.catchment ? catchment : null}
        hotspots={summary?.hotspots}
        loading={loading}
        health={healthRef.current}
        busy={busy}
        downloadReport={downloadReport}
        onOpenLogin={() => setRouteView('login')}
      />
    )
  }
  else if (error) {
    mainContent = (
      <div className="error-screen">
        <AlertTriangle size={38} color="#f87171" />
        <h2>Cannot reach the analysis engine</h2>
        <p style={{ maxWidth: 520, margin: '0.5rem auto 1.5rem', color: '#fca5a5', wordBreak: 'break-word' }}>
          {error}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setError(null)
              setLoading(true)
              api.catalog()
                .then((cat) => {
                  setCatalog(cat)
                  const firstId = cat?.watersheds ? Object.keys(cat.watersheds)[0] : null
                  if (firstId) setWatershedId(firstId)
                  else setLoading(false)
                })
                .catch((err) => {
                  setError(err.message || 'Unable to reach the DharaScan API.')
                  setLoading(false)
                })
            }}
          >
            Retry Connection
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setError(null)
              setRouteView('landing')
            }}
          >
            Back to Home
          </button>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          If running locally:
          <br />
          <code>python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000</code>
          <br />
          If the dataset is missing, run: <code>python scripts/generate_sample_data.py</code>
        </p>
      </div>
    )
  }
  else if (loading && !summary) {
    mainContent = (
      <div className="loader-screen">
        <Loader2 className="spinner" size={36} />
        <div>Loading micro-watershed intelligence…</div>
      </div>
    )
  }
  // SUPER ADMIN PORTAL
  else if (role === 'ADMIN') {
    mainContent = (
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
  else if (role === 'FIELD_OFFICER') {
    mainContent = (
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
  else if (role === 'AUDITOR') {
    mainContent = (
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
  else {
    mainContent = (
      <OfficerPortal
        catalog={catalog}
        watershedId={watershedId}
        onSelectWatershed={setWatershedId}
        summary={summary}
        overlays={overlays}
        layers={layers}
        setLayers={setLayers}
        basemap={basemap}
        setBasemap={setBasemap}
        interventions={interventions}
        photos={summary?.photos}
        selectedId={selectedId}
        selectIntervention={selectIntervention}
        focus={focus}
        radius={radius}
        opacity={opacity}
        catchment={layers.catchment ? catchment : null}
        hotspots={summary?.hotspots}
        loading={loading}
        health={healthRef.current}
        busy={busy}
        downloadReport={downloadReport}
        currentUser={currentUser}
        onLogout={handleLogout}
        analysis={analysis}
      />
    )
  }

  return (
    <>
      {mainContent}

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
        <ErrorBoundary>
          <InterventionModal
            data={analysis}
            radius={radius}
            onClose={() => setModalOpen(false)}
            onReport={() => downloadReport('intervention', analysis.intervention?.id || selectedId)}
            busy={busy}
          />
        </ErrorBoundary>
      )}

      {toast && (
        <div className={`toast ${toast.kind === 'error' ? 'error' : toast.kind === 'success' ? 'success' : ''}`}>
          {toast.kind === 'error' ? <AlertTriangle size={15} /> : null}
          {toast.message}
        </div>
      )}
    </>
  )
}
