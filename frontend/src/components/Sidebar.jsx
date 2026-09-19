import React from 'react'
import { Calendar, Filter, Layers3, Ruler, SlidersHorizontal } from 'lucide-react'

const TYPE_LABELS = {
  check_dam: 'Check Dam',
  farm_pond: 'Farm Pond',
  percolation_tank: 'Percolation Tank',
  plantation: 'Plantation',
  contour_bund: 'Contour Bund',
  gully_plug: 'Gully Plug',
}

const BASEMAPS = [
  { id: 'satellite', label: 'Satellite' },
  { id: 'street', label: 'Street' },
  { id: 'dark', label: 'Dark' },
]

const LAYER_GROUPS = [
  {
    title: 'Reference',
    items: [
      { key: 'boundary', label: 'Watershed boundary', color: '#38bdf8' },
      { key: 'hillshade', label: 'Terrain hillshade', color: '#a8a29e' },
      { key: 'streams', label: 'Drainage network', color: '#0ea5e9' },
    ],
  },
  {
    title: 'Interventions & evidence',
    items: [
      { key: 'interventions', label: 'Intervention markers', color: '#f59e0b' },
      { key: 'buffers', label: 'Impact buffers', color: '#f59e0b' },
      { key: 'photos', label: 'DRISHTI photo pins', color: '#fb7185' },
      { key: 'catchment', label: 'Delineated catchment', color: '#a78bfa' },
    ],
  },
  {
    title: 'Satellite analytics',
    items: [
      { key: 'ndvi', label: 'NDVI vegetation', color: '#10b981' },
      { key: 'ndwi', label: 'NDWI surface water', color: '#0ea5e9' },
      { key: 'delta', label: 'Change delta (T1-T0)', color: '#a78bfa' },
      { key: 'lulc', label: 'Land use / land cover', color: '#65a30d' },
      { key: 'slope', label: 'Slope (%)', color: '#d97706' },
      { key: 'hotspots', label: 'Change hotspots', color: '#f43f5e' },
    ],
  },
]

export default function Sidebar({
  summary,
  layers,
  setLayers,
  basemap,
  setBasemap,
  epochs,
  epochKey,
  setEpochKey,
  radius,
  setRadius,
  opacity,
  setOpacity,
  types,
  setTypes,
  onToggleCatchment,
}) {
  const toggle = (key) => {
    if (key === 'catchment') {
      onToggleCatchment(!layers.catchment)
      return
    }
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleType = (t) => {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  const meta = summary?.watershed || {}
  const availableTypes = Array.from(
    new Set((summary?.interventions?.features || []).map((f) => f.properties.type))
  )
  const effectiveEpoch = epochKey || epochs.find((e) => e.role === 'T1')?.key
  const activeEpoch = epochs.find((e) => e.key === effectiveEpoch)

  return (
    <aside className="sidebar-panel">
      {/* --------------------------- context --------------------------- */}
      <div>
        <div className="panel-section-title">Micro-Watershed</div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
          {meta.code || '—'}
        </div>
        <div className="tiny text-muted" style={{ marginBottom: 8 }}>{meta.name}</div>
        <div className="data-row"><span className="k">Village</span><span className="v">{meta.village || '—'}</span></div>
        <div className="data-row"><span className="k">Geographical area</span><span className="v">{meta.area_ha ?? '—'} ha</span></div>
        <div className="data-row"><span className="k">Rainfall</span><span className="v">{meta.rainfall_mm ?? '—'} mm</span></div>
        <div className="data-row"><span className="k">Soil</span><span className="v" style={{ fontSize: '0.7rem' }}>{meta.soil || '—'}</span></div>
        <div className="data-row"><span className="k">Aquifer</span><span className="v" style={{ fontSize: '0.7rem' }}>{meta.aquifer || '—'}</span></div>
      </div>

      <hr style={{ borderColor: 'var(--border-color)', margin: '2px 0' }} />

      {/* --------------------------- epochs ---------------------------- */}
      <div>
        <div className="panel-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={13} /> Observation epoch
        </div>
        <div className="epoch-grid">
          {(epochs || []).slice(0, 4).map((e) => (
            <button
              key={e.key}
              className={`epoch-btn ${effectiveEpoch === e.key ? 'active' : ''}`}
              onClick={() => setEpochKey(e.key)}
              title={e.label}
            >
              <b>{e.date}</b>
              <small>{e.season?.replace('_', ' ')}</small>
            </button>
          ))}
        </div>
        {(epochs || []).length > 4 && (
          <select
            className="filter-select"
            style={{ marginTop: 7 }}
            value={effectiveEpoch || ''}
            onChange={(e) => setEpochKey(e.target.value)}
          >
            {epochs.map((ep) => (
              <option key={ep.key} value={ep.key}>{ep.date} — {ep.label}</option>
            ))}
          </select>
        )}
        {activeEpoch && (
          <div className="tiny text-dim" style={{ marginTop: 6 }}>
            Role: <b style={{ color: 'var(--primary)' }}>{activeEpoch.role}</b> · cloud {Math.round((activeEpoch.cloud_cover_pct ?? 0))}%
          </div>
        )}
      </div>

      <hr style={{ borderColor: 'var(--border-color)', margin: '2px 0' }} />

      {/* --------------------------- basemap --------------------------- */}
      <div>
        <div className="panel-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Layers3 size={13} /> Basemap
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {BASEMAPS.map((b) => (
            <button
              key={b.id}
              className={`epoch-btn ${basemap === b.id ? 'active' : ''}`}
              style={{ flex: 1, textAlign: 'center' }}
              onClick={() => setBasemap(b.id)}
            >
              <b style={{ fontSize: '0.72rem' }}>{b.label}</b>
            </button>
          ))}
        </div>
      </div>

      <hr style={{ borderColor: 'var(--border-color)', margin: '2px 0' }} />

      {/* --------------------------- layers ---------------------------- */}
      <div>
        <div className="panel-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SlidersHorizontal size={13} /> Web-GIS layers
        </div>
        {LAYER_GROUPS.map((group) => (
          <div key={group.title} style={{ marginBottom: 10 }}>
            <div className="tiny text-dim" style={{ marginBottom: 5, letterSpacing: '0.06em' }}>{group.title.toUpperCase()}</div>
            <div className="layer-toggle-list">
              {group.items.map((item) => (
                <div
                  key={item.key}
                  className={`layer-toggle-item ${layers[item.key] ? 'active' : ''}`}
                  onClick={() => toggle(item.key)}
                >
                  <div className="layer-info">
                    <span className="layer-dot" style={{ background: item.color }} />
                    <span>{item.label}</span>
                  </div>
                  <label className="switch" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={!!layers[item.key]} onChange={() => toggle(item.key)} />
                    <span className="slider" />
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* -------------------------- opacity ---------------------------- */}
      <div>
        <div className="panel-section-title">Raster opacity</div>
        <div className="range-row">
          <input
            type="range" min="15" max="100" value={Math.round(opacity * 100)}
            onChange={(e) => setOpacity(Number(e.target.value) / 100)}
          />
          <span className="range-value">{Math.round(opacity * 100)}%</span>
        </div>
      </div>

      <hr style={{ borderColor: 'var(--border-color)', margin: '2px 0' }} />

      {/* ------------------------- buffer size ------------------------- */}
      <div>
        <div className="panel-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Ruler size={13} /> Analysis buffer
        </div>
        <div className="range-row">
          <input
            type="range" min="50" max="800" step="25" value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
          />
          <span className="range-value">{radius} m</span>
        </div>
        <div className="tiny text-dim" style={{ marginTop: 5 }}>
          {(Math.PI * radius * radius / 10000).toFixed(2)} ha assessed around each structure.
        </div>
      </div>

      <hr style={{ borderColor: 'var(--border-color)', margin: '2px 0' }} />

      {/* --------------------------- filters --------------------------- */}
      <div>
        <div className="panel-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={13} /> Structure type
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {availableTypes.map((t) => (
            <div
              key={t}
              className={`layer-toggle-item ${types.includes(t) ? 'active' : ''}`}
              onClick={() => toggleType(t)}
              style={{ padding: '5px 8px' }}
            >
              <div className="layer-info">
                <span>{TYPE_LABELS[t] || t}</span>
              </div>
              <label className="switch" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={types.includes(t)} onChange={() => toggleType(t)} />
                <span className="slider" />
              </label>
            </div>
          ))}
        </div>
        {types.length > 0 && (
          <button className="btn-ghost" style={{ marginTop: 8, width: '100%' }} onClick={() => setTypes([])}>
            Clear filter
          </button>
        )}
      </div>
    </aside>
  )
}
