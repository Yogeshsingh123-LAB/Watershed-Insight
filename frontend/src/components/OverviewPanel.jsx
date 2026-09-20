import React, { useEffect, useMemo, useState } from 'react'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  Award, Camera, Crosshair, Droplets, FileText, Leaf, MapPin, Target, TrendingUp,
} from 'lucide-react'

import api from '../api'

const TYPE_LABELS = {
  check_dam: 'Check dam',
  farm_pond: 'Farm pond',
  percolation_tank: 'Percolation tank',
  plantation: 'Plantation',
  contour_bund: 'Contour bund',
  gully_plug: 'Gully plug',
}

function deltaBadge(value, unit = '', decimals = 2, invert = false) {
  if (value == null) return <span className="metric-delta-badge badge-neutral">n/a</span>
  const positive = invert ? value < 0 : value > 0
  const cls = Math.abs(value) < 1e-9 ? 'badge-neutral' : positive ? 'badge-positive' : 'badge-negative'
  const sign = value > 0 ? '+' : ''
  return (
    <span className={`metric-delta-badge ${cls}`}>
      {value > 0 ? <TrendingUp size={11} /> : null}
      {sign}{value.toFixed(decimals)}{unit}
    </span>
  )
}

function Kpi({ icon: Icon, label, value, note, color = 'var(--primary)' }) {
  return (
    <div className="kpi-tile">
      <div className="label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon size={11} color={color} /> {label}
      </div>
      <div className="value" style={{ color }}>{value}</div>
      <div className="note">{note}</div>
    </div>
  )
}

export default function OverviewPanel({ summary, analysis, onSelect, onFly, onReport, busy, radius }) {
  const stats = summary?.stats || {}
  const ranking = summary?.ranking || []
  const series = useMemo(() => summary?.timeseries || [], [summary])
  const [localSeries, setLocalSeries] = useState(null)

  // When a structure is selected, show its own buffer response curve.
  useEffect(() => {
    if (!analysis?.intervention) { setLocalSeries(null); return }
    let cancelled = false
    api.interventionTimeseries(analysis.intervention.id, radius)
      .then((r) => { if (!cancelled) setLocalSeries(r.series) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [analysis?.intervention?.id, radius])

  const chartData = localSeries || series
  const chartTitle = localSeries ? `Buffer response — ${analysis.intervention.name}` : 'Watershed index profile'

  const a = analysis?.analysis
  const item = analysis?.intervention
  const scoreColor = a
    ? a.impact_score >= 60 ? 'var(--pos)' : a.impact_score >= 40 ? 'var(--accent-amber)' : 'var(--neg)'
    : 'var(--text-muted)'

  return (
    <div>
      {/* ------------------------- KPI grid ------------------------- */}
      <div className="kpi-grid">
        <Kpi icon={Leaf} label="NDVI mean" value={stats.ndvi_mean_t1?.toFixed(3) ?? '—'}
             note={`${stats.ndvi_change >= 0 ? '+' : ''}${stats.ndvi_change?.toFixed(3)} vs ${stats.epoch_t0}`} />
        <Kpi icon={Droplets} label="Surface water" value={`${stats.water_area_ha_t1?.toFixed(1) ?? '—'} ha`}
             note={`${stats.water_area_change_ha >= 0 ? '+' : ''}${stats.water_area_change_ha?.toFixed(2)} ha vs baseline`}
             color="var(--secondary)" />
        <Kpi icon={Target} label="Vegetated area" value={`${stats.veg_area_ha_t1?.toFixed(0) ?? '—'} ha`}
             note={`${stats.veg_area_change_ha >= 0 ? '+' : ''}${stats.veg_area_change_ha?.toFixed(1)} ha (NDVI>0.30)`} />
        <Kpi icon={Award} label="Structures" value={stats.interventions ?? '—'}
             note={`${ranking.filter((r) => r.impact_score >= 60).length} high-impact · ${ranking.filter((r) => r.impact_score < 42).length} to verify`}
             color="var(--accent-amber)" />
      </div>

      {/* ---------------------- selected structure ------------------ */}
      {a && item && (
        <div className="metric-card" style={{ borderColor: 'rgba(16,185,129,.35)' }}>
          <div className="metric-card-header">
            <div style={{ minWidth: 0 }}>
              <div className="metric-title" style={{ color: 'var(--primary)' }}>Selected structure</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: 2 }}>{item.name}</div>
              <div className="tiny text-dim">
                {TYPE_LABELS[item.type] || item.type} · {item.id} · installed {item.installation_date}
              </div>
            </div>
            <button className="btn-ghost" style={{ padding: '5px 8px' }} onClick={() => onFly(item)} title="Zoom to structure">
              <Crosshair size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '6px 0 8px' }}>
            <span className="metric-main-value" style={{ color: scoreColor }}>{a.impact_score?.toFixed(0)}</span>
            <span className="tiny text-muted">/ 100 composite impact</span>
            <span className={`chip ${(a.evidence_strength || a.confidence) === 'High' ? 'badge-positive' : (a.evidence_strength || a.confidence) === 'Moderate' ? 'badge-amber' : 'badge-neutral'}`}>
              {a.evidence_strength || a.confidence} response
            </span>
            {a.confidence_score != null && (
              <span className="chip badge-neutral" title={Object.entries(a.confidence?.factors || {}).map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`).join(', ')}>
                {a.confidence_score?.toFixed(0)}% confidence
              </span>
            )}
          </div>

          <div className="data-row">
            <span className="k">NDVI (land only)</span>
            <span className="v">{a.ndvi_before_land?.toFixed(3)} → {a.ndvi_after_land?.toFixed(3)} {deltaBadge(a.ndvi_change_land, '', 3)}</span>
          </div>
          <div className="data-row">
            <span className="k">Surface water</span>
            <span className="v">{a.water_area_before_ha?.toFixed(2)} → {a.water_area_after_ha?.toFixed(2)} ha {deltaBadge(a.water_area_change_ha, ' ha')}</span>
          </div>
          <div className="data-row">
            <span className="k">Vegetated area</span>
            <span className="v">{a.veg_area_before_ha?.toFixed(2)} → {a.veg_area_after_ha?.toFixed(2)} ha {deltaBadge(a.veg_area_change_ha, ' ha')}</span>
          </div>
          <div className="data-row">
            <span className="k">Buffer improved</span>
            <span className="v">{a.improved_pct}% of {a.buffer_area_ha?.toFixed(2)} ha</span>
          </div>

          {a.newly_inundated_ha > 0.05 && (
            <div className="tiny text-muted" style={{ marginTop: 6 }}>
              {a.newly_inundated_ha.toFixed(2)} ha converted to open water — excluded from the
              land-only vegetation comparison.
            </div>
          )}

          <div className="narrative-box" style={{ marginTop: 10 }}>{a.interpretation}</div>

          <div className="btn-row">
            <button className="btn-ghost" onClick={() => onSelect(item.id)} disabled={busy}>
              <FileText size={13} /> Evidence pack
            </button>
            <button className="btn-primary" onClick={onReport} disabled={busy}>
              <FileText size={14} /> Download PDF
            </button>
          </div>
        </div>
      )}

      {/* ------------------------- time series ---------------------- */}
      <div className="section-block">
        <h4><TrendingUp size={12} /> {chartTitle}</h4>
        <div style={{ height: 168 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="gNdvi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="gNdwi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.14)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={(d) => String(d).slice(2, 7)} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} domain={[-0.6, 0.8]} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,.25)', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Area type="monotone" dataKey="ndvi" stroke="#10b981" strokeWidth={2} fill="url(#gNdvi)" name="NDVI" />
              <Area type="monotone" dataKey="ndwi" stroke="#38bdf8" strokeWidth={1.6} fill="url(#gNdwi)" name="NDWI" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {localSeries && (
          <button className="btn-ghost" style={{ marginTop: 6, width: '100%' }} onClick={() => setLocalSeries(null)}>
            Show whole-watershed profile
          </button>
        )}
      </div>

      {/* --------------------------- ranking ------------------------ */}
      <div className="section-block">
        <h4><Award size={12} /> Intervention performance ({radius} m buffer)</h4>
        {ranking.length === 0 && <div className="empty-state">No structures in this micro-watershed.</div>}
        {ranking.map((r) => (
          <div
            key={r.id}
            className={`metric-card clickable ${analysis?.intervention?.id === r.id ? 'selected' : ''}`}
            onClick={() => onSelect(r.id)}
            style={{ padding: '9px 11px' }}
          >
            <div className="flex-between">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.rank}. {r.name}
                </div>
                <div className="tiny text-dim">
                  {TYPE_LABELS[r.type] || r.type} · {r.status} · {r.photos} photos
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem',
                  color: r.impact_score >= 60 ? 'var(--pos)' : r.impact_score >= 42 ? 'var(--accent-amber)' : 'var(--neg)',
                }}>
                  {r.impact_score?.toFixed(0)}
                </div>
                <div className="tiny text-dim" title="Measured impact (0-100)">
                  impact
                </div>
                {r.confidence_score != null && (
                  <div className="tiny" style={{ color: 'var(--text-dim)' }}>
                    {r.confidence_score?.toFixed(0)}% conf · p{r.percentile_vs_control?.toFixed(0)}
                  </div>
                )}
              </div>
            </div>
            <div className="progress-track" style={{ marginTop: 6 }}>
              <div
                className="progress-fill"
                style={{
                  width: `${Math.max(2, Math.min(100, r.impact_score))}%`,
                  background: r.impact_score >= 60 ? 'linear-gradient(90deg,#059669,#34d399)'
                    : r.impact_score >= 42 ? 'linear-gradient(90deg,#d97706,#fbbf24)'
                    : 'linear-gradient(90deg,#b91c1c,#f87171)',
                }}
              />
            </div>
            <div className="tiny text-muted" style={{ marginTop: 5 }}>
              ΔNDVI {r.ndvi_change_land >= 0 ? '+' : ''}{r.ndvi_change_land?.toFixed(3)} ·
              Δwater {r.water_area_change_ha >= 0 ? '+' : ''}{r.water_area_change_ha?.toFixed(2)} ha
              {r.cost_per_ha_improved_inr ? ` · ₹${r.cost_per_ha_improved_inr.toLocaleString('en-IN')}/ha` : ''}
            </div>
          </div>
        ))}
      </div>

      {/* ----------------------- photo evidence --------------------- */}
      <div className="section-block">
        <h4><Camera size={12} /> Evidence audit</h4>
        <div className="data-row">
          <span className="k">Geo-coded photographs</span>
          <span className="v">{summary?.photo_stats?.total ?? 0}</span>
        </div>
        <div className="data-row">
          <span className="k">Machine-verified</span>
          <span className="v" style={{ color: 'var(--pos)' }}>
            {summary?.photo_stats?.verified ?? 0} ({summary?.photo_stats?.verified_pct ?? 0}%)
          </span>
        </div>
        <div className="data-row">
          <span className="k">Flagged / questionable</span>
          <span className="v" style={{ color: 'var(--accent-amber)' }}>{summary?.photo_stats?.questionable ?? 0}</span>
        </div>
        <div className="data-row">
          <span className="k">Inside a structure buffer</span>
          <span className="v">{summary?.photo_stats?.within_buffer ?? 0}</span>
        </div>
      </div>
    </div>
  )
}
