import React, { useEffect, useMemo, useState } from 'react'
import { Compass, FileDown, Loader2, LogIn, LogOut, MapPin, ShieldCheck, UserCheck } from 'lucide-react'

/**
 * Navbar - brand, the State > District > Block > Micro-watershed cascade that
 * mirrors administrative hierarchy, live system status, officer profile, and logout.
 */
export default function Navbar({
  catalog,
  watershedId,
  onSelectWatershed,
  health,
  busy,
  onGenerateReport,
  currentUser,
  onOpenLogin,
  onLogout,
}) {
  const hierarchy = catalog?.hierarchy || []
  const watersheds = catalog?.watersheds || {}

  // Locate the currently selected watershed inside the hierarchy.
  const current = useMemo(() => {
    for (const st of hierarchy) {
      for (const di of st.districts) {
        for (const bl of di.blocks) {
          const ws = bl.watersheds.find((w) => w.id === watershedId)
          if (ws) return { st, di, bl, ws }
        }
      }
    }
    // Fall back to the first entry of the tree.
    const st = hierarchy[0]
    const di = st?.districts?.[0]
    const bl = di?.blocks?.[0]
    return st && di && bl ? { st, di, bl, ws: bl.watersheds[0] } : null
  }, [hierarchy, watershedId])

  const [stateCode, setStateCode] = useState(current?.st?.code || '')
  const [districtCode, setDistrictCode] = useState(current?.di?.code || '')
  const [blockCode, setBlockCode] = useState(current?.bl?.code || '')

  // Keep the cascade in sync when the watershed changes from elsewhere.
  useEffect(() => {
    if (!current) return
    setStateCode(current.st.code)
    setDistrictCode(current.di.code)
    setBlockCode(current.bl.code)
  }, [current?.st?.code, current?.di?.code, current?.bl?.code]) // eslint-disable-line react-hooks/exhaustive-deps

  const state = hierarchy.find((s) => s.code === stateCode) || hierarchy[0]
  const districts = state?.districts || []
  const district = districts.find((d) => d.code === districtCode) || districts[0]
  const blocks = district?.blocks || []
  const block = blocks.find((b) => b.code === blockCode) || blocks[0]
  const wsOptions = block?.watersheds || []

  if (!hierarchy.length) {
    return (
      <header className="navbar">
        <div className="navbar-brand">
          <div className="brand-icon"><Compass size={21} /></div>
          <div>
            <h1 className="brand-title">WATERSHED INSIGHT</h1>
            <div className="tiny text-muted">Department of Land Resources • Govt. of India</div>
          </div>
        </div>
      </header>
    )
  }

  const pickFirstWatershed = (list) => {
    if (list?.length) onSelectWatershed(list[0].id)
  }

  return (
    <header className="navbar" role="banner">
      <div className="navbar-brand">
        <div className="brand-icon"><Compass size={21} /></div>
        <div>
          <h1 className="brand-title">WATERSHED INSIGHT</h1>
          <div className="tiny text-muted">National Geospatial Watershed Monitoring & Evidence Platform</div>
        </div>
        <span className="brand-badge">DoLR • Govt. of India</span>
      </div>

      <div className="navbar-actions">
        <div className="location-selector" role="search" aria-label="Administrative Location Hierarchy">
          <MapPin size={15} color="#059669" aria-hidden="true" />
          <select
            className="cascade-select"
            value={state?.code || ''}
            onChange={(e) => {
              setStateCode(e.target.value)
              const s = hierarchy.find((x) => x.code === e.target.value)
              setDistrictCode(s?.districts?.[0]?.code || '')
              setBlockCode(s?.districts?.[0]?.blocks?.[0]?.code || '')
              pickFirstWatershed(s?.districts?.[0]?.blocks?.[0]?.watersheds)
            }}
            title="State Location"
            aria-label="Select State"
          >
            {hierarchy.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
          <span className="cascade-arrow">›</span>

          <select
            className="cascade-select"
            value={district?.code || ''}
            onChange={(e) => {
              setDistrictCode(e.target.value)
              const d = districts.find((x) => x.code === e.target.value)
              setBlockCode(d?.blocks?.[0]?.code || '')
              pickFirstWatershed(d?.blocks?.[0]?.watersheds)
            }}
            title="District Location"
            aria-label="Select District"
          >
            {districts.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
          </select>
          <span className="cascade-arrow">›</span>

          <select
            className="cascade-select"
            value={block?.code || ''}
            onChange={(e) => {
              setBlockCode(e.target.value)
              const b = blocks.find((x) => x.code === e.target.value)
              pickFirstWatershed(b?.watersheds)
            }}
            title="Block Location"
            aria-label="Select Block"
          >
            {blocks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
          </select>
          <span className="cascade-arrow">›</span>

          <select
            className="cascade-select"
            value={watershedId || ''}
            onChange={(e) => onSelectWatershed(e.target.value)}
            title="Micro-watershed"
            aria-label="Select Micro-watershed"
            style={{ fontWeight: 700, color: '#059669', borderColor: '#059669' }}
          >
            {wsOptions.map((w) => (
              <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
            ))}
          </select>
        </div>

        <div className={`status-chip ${health?.status === 'online' ? '' : 'degraded'}`}>
          <span className="pulse-dot" />
          <ShieldCheck size={13} aria-hidden="true" />
          <span>
            {health?.status === 'online' ? 'SRISHTI ACTIVE' : health?.status || 'INITIALIZING'}
            {watersheds[watershedId]
              ? ` • ${watersheds[watershedId].interventions} Structures Monitored`
              : ''}
          </span>
        </div>

        {/* Current Officer Profile Badge + Functional Logout Button */}
        {currentUser ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl text-xs">
              <UserCheck size={14} className="text-emerald-700" />
              <div className="text-left leading-none">
                <div className="text-[11px] font-bold text-slate-800">{currentUser.name}</div>
                <div className="text-[9px] text-emerald-700 font-mono mt-0.5">{currentUser.roleTitle || currentUser.role}</div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
              title="Logout of Officer Portal"
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
            title="Return to Public Front Page"
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        )}

        <button
          className="btn-ghost card-hover-lift"
          onClick={onGenerateReport}
          disabled={busy || !watershedId}
          title="Generate Official Micro-Watershed Executive Dossier (PDF)"
          aria-label="Download Official Watershed Report PDF"
          style={{ padding: '7px 13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {busy ? <Loader2 size={14} className="spinner" /> : <FileDown size={14} />}
          <span>Export Dossier (PDF)</span>
        </button>
      </div>
    </header>
  )
}
