import React, { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { Activity, ArrowDownRight, ArrowUpRight, CalendarRange, Flame, Layers } from 'lucide-react'

import api from '../api'

const CLASS_COLORS = {
  large_improvement: '#15803d',
  improvement: '#4ade80',
  stable: '#94a3b8',
  decline: '#fb923c',
  large_decline: '#b91c1c',
}

const INDEX_OPTIONS = [
  { id: 'ndvi', label: 'NDVI (vegetation)' },
  { id: 'ndwi', label: 'NDWI (water)' },
  { id: 'savi', label: 'SAVI (soil-adjusted)' },
  { id: 'ndbi', label: 'NDBI (built-up/bare)' },
]

export default function ChangePanel({ summary, watershedId, epochKey, setEpochKey, epochs }) {
  const [index, setIndex] = useState('ndvi')
  const [epochA, setEpochA] = useState('')
  const [epochB, setEpochB] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const t0 = epochs.find((e) => e.role === 'T0')?.key || epochs[0]?.key
  const t1 = epochs.find((e) => e.role === 'T1')?.key || epochs[epochs.length - 1]?.key

  useEffect(() => {
    setEpochA(t0); setEpochB(t1)
  }, [t0, t1, watershedId])

  useEffect(() => {
    if (!watershedId || !epochA || !epochB) return
    let cancelled = false
    setLoading(true)
    api.changeDetection(watershedId, { index, epoch_a: epochA, epoch_b: epochB })
      .then((r) => { if (!cancelled) setResult(r) })
      .catch(() => { if (!cancelled) setResult(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [watershedId, index, epochA, epochB])

  const classes = useMemo(() => {
    if (!result?.change_classes) return []
    return Object.entries(result.change_classes).map(([key, v]) => ({
      key: key.replace(/_/g, ' '),
      raw: key,
      area: v.area_ha,
      pct: v.pct_of_area,
      color: CLASS_COLORS[key] || '#94a3b8',
    }))
  }, [result])

  const series = summary?.timeseries || []
  const hotspots = summary?.hotspots || {}

  return (
    <div>
      {/* ------------------------- controls ------------------------- */}
      <div className="section-block">
        <h4><Layers size={12} /> Change detection configuration</h4>
        <div className="filter-group">
          <label>Spectral index</label>
          <select className="filter-select" value={index} onChange={(e) => setIndex(e.target.value)}>
            {INDEX_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="filter-group">
            <label>Baseline (A)</label>
            <select className="filter-select" value={epochA} onChange={(e) => setEpochA(e.target.value)}>
              {epochs.map((e) => <option key={e.key} value={e.key}>{e.date}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Comparison (B)</label>
            <select className="filter-select" value={epochB} onChange={(e) => setEpochB(e.target.value)}>
              {epochs.map((e) => <option key={e.key} value={e.key}>{e.date}</option>)}
            </select>
          </div>
        </div>
        {(epochA === t0 && epochB === t1) && (
          <div className="tiny text-dim" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <CalendarRange size={11} />
            Season-matched baseline: both epochs are pre-monsoon acquisitions, so the
            rainfall signal is largely controlled.
          </div>
        )}
      </div>

      {/* ------------------------- headline ------------------------- */}
      {result && (
        <>
          <div className="kpi-grid">
            <div className="kpi-tile">
              <div className="label">Mean {index.toUpperCase()} A → B</div>
              <div className="value">{result.mean_before?.toFixed(3)} → {result.mean_after?.toFixed(3)}</div>
              <div className="note" style={{ color: result.mean_delta >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                Δ {result.mean_delta >= 0 ? '+' : ''}{result.mean_delta?.toFixed(4)}
              </div>
            </div>
            <div className="kpi-tile">
              <div className="label">Area improved / degraded</div>
              <div className="value" style={{ fontSize: '1rem' }}>
                {result.pct_improved_area?.toFixed(1)}% / {result.pct_degraded_area?.toFixed(1)}%
              </div>
              <div className="note">of the watershed area</div>
            </div>
          </div>

          <div className="section-block">
            <h4><Activity size={12} /> Pixel change distribution</h4>
            <div style={{ height: 168 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classes} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.14)" />
                  <XAxis dataKey="key" tick={{ fontSize: 8.5, fill: '#94a3b8' }} interval={0}
                         angle={-18} textAnchor="end" height={44} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,.25)', borderRadius: 8, fontSize: 11 }}
                    formatter={(v, n, p) => [`${v} ha (${p.payload.pct}%)`, 'Area']}
                  />
                  <Bar dataKey="area" radius={[4, 4, 0, 0]}>
                    {classes.map((c) => <Cell key={c.raw} fill={c.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="tiny text-dim" style={{ marginTop: 4 }}>
              Classes: |Δ{index.toUpperCase()}| ≤ 0.10 = stable; ±0.10–0.20 = change; &gt; 0.20 = large change.
            </div>
          </div>
        </>
      )}

      {loading && <div className="empty-state">Recomputing change statistics…</div>}

      {/* ------------------------ hotspots -------------------------- */}
      <div className="section-block">
        <h4><Flame size={12} /> Change hotspots (field-verification targets)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          <div>
            <div className="tiny" style={{ color: 'var(--pos)', fontWeight: 700, marginBottom: 5 }}>
              <ArrowUpRight size={11} style={{ verticalAlign: -2 }} /> STRONGEST GAIN
            </div>
            {(hotspots.gainers || []).slice(0, 4).map((h, i) => (
              <div className="data-row" key={`g${i}`} style={{ fontSize: '0.72rem' }}>
                <span className="k mono">{h.lat.toFixed(4)}, {h.lon.toFixed(4)}</span>
                <span className="v" style={{ color: 'var(--pos)' }}>+{h.mean_delta?.toFixed(3)}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="tiny" style={{ color: 'var(--neg)', fontWeight: 700, marginBottom: 5 }}>
              <ArrowDownRight size={11} style={{ verticalAlign: -2 }} /> STRONGEST LOSS
            </div>
            {(hotspots.losers || []).slice(0, 4).map((h, i) => (
              <div className="data-row" key={`l${i}`} style={{ fontSize: '0.72rem' }}>
                <span className="k mono">{h.lat.toFixed(4)}, {h.lon.toFixed(4)}</span>
                <span className="v" style={{ color: h.mean_delta < 0 ? 'var(--neg)' : 'var(--text-muted)' }}>
                  {h.mean_delta >= 0 ? '+' : ''}{h.mean_delta?.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="tiny text-dim" style={{ marginTop: 6 }}>
          5×5 block aggregation of the Δ{index.toUpperCase()} raster. Enable the
          "Change hotspots" layer to see them on the map.
        </div>
      </div>

      {/* ---------------------- monsoon cycle ------------------------ */}
      <div className="section-block">
        <h4><CalendarRange size={12} /> Seasonal cycle (whole watershed)</h4>
        <div style={{ height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.14)" />
              <XAxis dataKey="date" tick={{ fontSize: 8.5, fill: '#94a3b8' }}
                     tickFormatter={(d) => String(d).slice(2, 7)} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,.25)', borderRadius: 8, fontSize: 11 }} />
              <Line type="monotone" dataKey="water_area_ha" stroke="#38bdf8" strokeWidth={2} dot={{ r: 2.5 }} name="Water (ha)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="tiny text-dim">
          Surface-water extent cycles with the monsoon. A rising dry-season (May) value
          across years is the signature of functional water-harvesting structures.
        </div>
      </div>
    </div>
  )
}
