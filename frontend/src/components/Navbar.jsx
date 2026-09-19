import React, { useEffect, useMemo, useState } from 'react'
import { Compass, FileDown, Loader2, MapPin, ShieldCheck } from 'lucide-react'

/**
 * Navbar - brand, the State > District > Block > Micro-watershed cascade that
 * mirrors the SRISHTI administrative hierarchy, and the live system status.
 */
export default function Navbar({
  catalog,
  watershedId,
  onSelectWatershed,
  health,
  busy,
  onGenerateReport,
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

  // Keep the cascade in sync when the watershed changes from elsewhere (map, panel).
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
            <div className="tiny text-muted">Decision-Support Platform • PS26015</div>
          </div>
        </div>
      </header>
    )
  }

  const pickFirstWatershed = (list) => {
    if (list?.length) onSelectWatershed(list[0].id)
  }

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <div className="brand-icon"><Compass size={21} /></div>
        <div>
          <h1 className="brand-title">WATERSHED INSIGHT</h1>
          <div className="tiny text-muted">Geospatial Decision Support • SIH PS26015</div>
        </div>
        <span className="brand-badge">DoLR • SRISHTI-DRISHTI</span>
      </div>

      <div className="navbar-actions">
        <div className="location-selector">
          <MapPin size={15} color="#10b981" />
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
            title="State"
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
            title="District"
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
            title="Block"
          >
            {blocks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
          </select>
          <span className="cascade-arrow">›</span>

          <select
            className="cascade-select"
            value={watershedId || ''}
            onChange={(e) => onSelectWatershed(e.target.value)}
            title="Micro-watershed"
            style={{ fontWeight: 700, color: '#6ee7b7', borderColor: 'rgba(16,185,129,.4)' }}
          >
            {wsOptions.map((w) => (
              <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
            ))}
          </select>
        </div>

        <div className={`status-chip ${health?.status === 'online' ? '' : 'degraded'}`}>
          <span className="pulse-dot" />
          <ShieldCheck size={13} />
          <span>
            {health?.status === 'online' ? 'Live ingestion' : health?.status || 'checking'}
            {watersheds[watershedId]
              ? ` • ${watersheds[watershedId].interventions} structures • ${watersheds[watershedId].photos} photos`
              : ''}
          </span>
        </div>

        <button
          className="btn-ghost"
          onClick={onGenerateReport}
          disabled={busy || !watershedId}
          title="Generate the full micro-watershed assessment PDF"
          style={{ padding: '7px 11px' }}
        >
          {busy ? <Loader2 size={14} className="spinner" /> : <FileDown size={14} />}
          Watershed PDF
        </button>
      </div>
    </header>
  )
}
