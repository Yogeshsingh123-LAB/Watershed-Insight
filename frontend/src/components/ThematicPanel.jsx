import React from 'react'
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Layers, Mountain, Sprout, Waves } from 'lucide-react'

const LAYER_SHORTCUTS = [
  { key: 'lulc', label: 'LULC map', icon: Sprout, color: '#65a30d' },
  { key: 'ndvi', label: 'NDVI', icon: Sprout, color: '#10b981' },
  { key: 'ndwi', label: 'NDWI water', icon: Waves, color: '#0ea5e9' },
  { key: 'hillshade', label: 'Hillshade', icon: Mountain, color: '#a8a29e' },
  { key: 'slope', label: 'Slope', icon: Mountain, color: '#d97706' },
  { key: 'streams', label: 'Drainage', icon: Waves, color: '#0ea5e9' },
  { key: 'catchment', label: 'Catchment', icon: Layers, color: '#a78bfa' },
]

export default function ThematicPanel({ summary, layers, setLayers, onToggleCatchment, catchment, selectedId }) {
  const lulc = summary?.lulc
  const terrain = summary?.terrain
  const morph = terrain?.morphometry || {}
  const slopeClasses = terrain?.slope_classes_ha || {}
  const transition = lulc?.transition

  const chartData = (lulc?.classes || []).map((c) => ({
    name: c.label.split(' / ')[0].slice(0, 12),
    T0: c.t0_ha,
    T1: c.t1_ha,
    color: c.color,
  }))

  const toggle = (key) => {
    if (key === 'catchment') { onToggleCatchment(!layers.catchment); return }
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div>
      {/* --------------------- layer shortcuts ---------------------- */}
      <div className="section-block">
        <h4><Layers size={12} /> Thematic map layers</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {LAYER_SHORTCUTS.map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              className="btn-ghost"
              style={{
                flex: '0 0 auto',
                padding: '6px 10px',
                fontSize: '0.7rem',
                borderColor: layers[key] ? color : 'var(--border-strong)',
                color: layers[key] ? '#e2e8f0' : 'var(--text-muted)',
                background: layers[key] ? `${color}22` : 'transparent',
              }}
              onClick={() => toggle(key)}
              disabled={key === 'catchment' && !selectedId}
              title={key === 'catchment' && !selectedId ? 'Select a structure first' : ''}
            >
              <Icon size={12} color={color} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* -------------------------- LULC ---------------------------- */}
      <div className="section-block">
        <h4><Sprout size={12} /> Land use / land cover composition</h4>
        <div style={{ height: 190 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.14)" />
              <XAxis dataKey="name" tick={{ fontSize: 8.5, fill: '#94a3b8' }} angle={-20} textAnchor="end" height={50} interval={0} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,.25)', borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="T0" fill="#64748b" radius={[3, 3, 0, 0]} name={`Baseline`} />
              <Bar dataKey="T1" fill="#10b981" radius={[3, 3, 0, 0]} name="Latest" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {transition && (
          <div className="narrative-box info" style={{ marginTop: 8 }}>
            {transition.changed_area_ha?.toFixed(1)} ha ({transition.changed_pct}%) changed class between
            epochs; {transition.unchanged_area_ha?.toFixed(1)} ha stayed stable.
          </div>
        )}

        {(transition?.top_transitions || []).slice(0, 5).map((t, i) => (
          <div className="data-row" key={i} style={{ fontSize: '0.72rem' }}>
            <span className="k">{t.from_label.split(' / ')[0]} → {t.to_label.split(' / ')[0]}</span>
            <span className="v" style={{
              color: t.direction === 'improvement' ? 'var(--pos)'
                : t.direction === 'degradation' ? 'var(--neg)' : 'var(--text-muted)',
            }}>
              {t.area_ha.toFixed(2)} ha
            </span>
          </div>
        ))}
      </div>

      {/* ------------------------- terrain -------------------------- */}
      <div className="section-block">
        <h4><Mountain size={12} /> Terrain &amp; morphometry</h4>
        <div className="data-row"><span className="k">Basin area</span><span className="v">{morph.basin_area_ha?.toFixed(1)} ha</span></div>
        <div className="data-row"><span className="k">Relief (min–max)</span><span className="v">{morph.dem_min_m?.toFixed(0)}–{morph.dem_max_m?.toFixed(0)} m</span></div>
        <div className="data-row"><span className="k">Mean slope</span><span className="v">{morph.mean_slope_pct?.toFixed(1)} %</span></div>
        <div className="data-row"><span className="k">Drainage density</span><span className="v">{morph.drainage_density_km_per_km2?.toFixed(2)} km/km²</span></div>
        <div className="data-row"><span className="k">Stream frequency</span><span className="v">{morph.stream_frequency_per_km2?.toFixed(1)} /km²</span></div>
        <div className="data-row"><span className="k">Stream length</span><span className="v">{morph.stream_length_km?.toFixed(2)} km</span></div>
        <div className="data-row"><span className="k">Max Strahler order</span><span className="v">{morph.max_strahler_order ?? '—'}</span></div>
        <div className="data-row"><span className="k">Form factor</span><span className="v">{morph.form_factor?.toFixed(3)}</span></div>
        <div className="data-row"><span className="k">Elongation ratio</span><span className="v">{morph.elongation_ratio?.toFixed(3)}</span></div>
        <div className="data-row"><span className="k">Mean TWI</span><span className="v">{morph.mean_twi?.toFixed(2)}</span></div>
      </div>

      {/* ---------------------- slope classes ----------------------- */}
      <div className="section-block">
        <h4>Slope classes (IWMP treatment targeting)</h4>
        {Object.entries(slopeClasses).map(([label, ha]) => {
          const total = Object.values(slopeClasses).reduce((a, b) => a + b, 0) || 1
          return (
            <div key={label} style={{ marginBottom: 7 }}>
              <div className="flex-between" style={{ fontSize: '0.72rem' }}>
                <span className="text-muted">{label}</span>
                <span className="v">{ha.toFixed(1)} ha</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${(ha / total) * 100}%`,
                    background: 'linear-gradient(90deg,#d97706,#fbbf24)',
                  }}
                />
              </div>
            </div>
          )
        })}
        <div className="tiny text-dim" style={{ marginTop: 6 }}>
          Slopes of 2–10 % suit bunding and farm ponds; &gt; 15 % requires gully control
          and afforestation rather than in-situ moisture conservation.
        </div>
      </div>

      {/* ------------------------ catchment ------------------------- */}
      {catchment?.catchment && (
        <div className="section-block">
          <h4><Layers size={12} /> Delineated catchment</h4>
          <div className="data-row">
            <span className="k">Contributing area</span>
            <span className="v">{catchment.catchment.area_ha} ha</span>
          </div>
          <div className="data-row">
            <span className="k">Grid cells</span>
            <span className="v">{catchment.catchment.cells.toLocaleString()}</span>
          </div>
          <div className="tiny text-dim" style={{ marginTop: 6 }}>
            Derived from the DEM with D8 flow routing and pour-point snapping; it is the
            hydrological justification for the structure's location and size.
          </div>
        </div>
      )}
    </div>
  )
}
