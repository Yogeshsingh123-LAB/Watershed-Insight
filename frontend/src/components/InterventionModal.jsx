import React, { useEffect, useState } from 'react'
import {
  Award, Calendar, CheckCircle2, Droplets, FileDown, Leaf, Loader2, MapPin,
  Mountain, ShieldAlert, X,
} from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import api from '../api'

const TYPE_LABELS = {
  check_dam: 'Check Dam',
  farm_pond: 'Farm Pond',
  percolation_tank: 'Percolation Tank',
  plantation: 'Plantation',
  contour_bund: 'Contour Bund',
  gully_plug: 'Gully Plug',
}

export default function InterventionModal({ data, radius, onClose, onReport, busy }) {
  const { intervention: item, analysis: a, matched_photos = [], timeseries = [], lulc } = data
  const [interp, setInterp] = useState({})
  const [catchment, setCatchment] = useState(null)

  useEffect(() => {
    let cancelled = false
    matched_photos.slice(0, 2).forEach((p) => {
      api.interpretation(p.photo_id)
        .then((r) => { if (!cancelled) setInterp((prev) => ({ ...prev, [p.photo_id]: r })) })
        .catch(() => {})
    })
    api.catchment(item.id)
      .then((r) => { if (!cancelled) setCatchment(r.catchment) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [item.id, matched_photos])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const scoreColor = a.impact_score >= 60 ? 'var(--pos)' : a.impact_score >= 42 ? 'var(--accent-amber)' : 'var(--neg)'
  const photo = matched_photos[0]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Award size={20} color="#10b981" />
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>{item.name}</div>
              <div className="tiny text-muted">
                {TYPE_LABELS[item.type] || item.type} · {item.id} · {item.village} · installed {item.installation_date}
              </div>
            </div>
          </div>
          <div className="flex">
            <button className="btn-ghost" onClick={onReport} disabled={busy} style={{ padding: '7px 12px' }}>
              {busy ? <Loader2 size={13} className="spinner" /> : <FileDown size={13} />}
              Evidence PDF
            </button>
            <button className="close-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div className="modal-body">
          {/* ---------------------- left column ---------------------- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {photo ? (
              <div className="photo-frame">
                <img src={photo.url} alt={photo.photo_id} />
                <div className="photo-meta">
                  <div style={{ color: 'var(--text-main)', fontWeight: 700, marginBottom: 4 }}>
                    {photo.photo_id}
                  </div>
                  <div className="row"><MapPin size={12} color="#10b981" />
                    {photo.latitude?.toFixed(6)}, {photo.longitude?.toFixed(6)}
                  </div>
                  <div className="row"><Calendar size={12} color="#38bdf8" />
                    {photo.timestamp ? String(photo.timestamp).replace('T', ' ') : 'no timestamp'}
                  </div>
                  <div className="row">
                    {photo.quality === 'verified'
                      ? <span className="chip badge-positive"><CheckCircle2 size={10} /> verified · {photo.distance_to_intervention_m} m from structure</span>
                      : <span className="chip badge-negative"><ShieldAlert size={10} /> {photo.validation?.join(', ') || 'questionable'}</span>}
                  </div>
                  {interp[photo.photo_id]?.available && (
                    <div className="tiny text-muted" style={{ marginTop: 6 }}>
                      Automated read: {interp[photo.photo_id].label_text.toLowerCase()} —
                      vegetation {interp[photo.photo_id].composition_pct.vegetation}%,
                      water {interp[photo.photo_id].composition_pct.water}%,
                      soil {interp[photo.photo_id].composition_pct.soil_or_earthwork}%.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                No geo-coded photograph is bound to this structure yet. Upload one from the
                Photos tab to complete the evidence chain.
              </div>
            )}

            <div className="metric-card" style={{ padding: '11px 12px' }}>
              <div className="metric-title" style={{ marginBottom: 7 }}>Structure parameters</div>
              <div className="data-row"><span className="k">Sanctioned cost</span><span className="v">₹ {Number(item.cost_inr || 0).toLocaleString('en-IN')}</span></div>
              <div className="data-row"><span className="k">Storage capacity</span><span className="v">{item.capacity_tcm || 0} TCM</span></div>
              <div className="data-row"><span className="k">Execution status</span><span className="v" style={{ color: 'var(--pos)' }}>{item.status}</span></div>
              <div className="data-row"><span className="k">Beneficiaries</span><span className="v">{item.beneficiaries ?? '—'}</span></div>
              <div className="data-row"><span className="k">GPS</span><span className="v mono">{item.latitude?.toFixed(5)}, {item.longitude?.toFixed(5)}</span></div>
              {catchment && (
                <div className="data-row">
                  <span className="k">Upstream catchment</span>
                  <span className="v">{catchment.area_ha} ha</span>
                </div>
              )}
            </div>

            {matched_photos.length > 1 && (
              <div>
                <div className="metric-title" style={{ marginBottom: 6 }}>Additional evidence ({matched_photos.length - 1})</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {matched_photos.slice(1, 5).map((p) => (
                    <img
                      key={p.photo_id}
                      src={p.thumbnail_url || p.url}
                      alt={p.photo_id}
                      title={`${p.photo_id} · ${p.timestamp || ''}`}
                      style={{ width: 66, height: 50, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-color)' }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ---------------------- right column --------------------- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            <div className="flex-between">
              <div>
                <div className="metric-title">{radius} m buffer impact assessment</div>
                <div className="tiny text-dim">
                  {a.epoch_a?.date} → {a.epoch_b?.date} · {a.buffer_area_ha?.toFixed(2)} ha assessed
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
                  {a.impact_score?.toFixed(0)}
                </div>
                <div className="tiny text-muted">{a.evidence_strength || a.confidence} response</div>
              </div>
            </div>

            {(bundle?.confidence || bundle?.control_context) && (
              <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 10 }}>
                <div className="kpi-tile">
                  <div className="label">Confidence</div>
                  <div className="value" style={{ fontSize: '1.05rem' }}>
                    {bundle.confidence?.score?.toFixed(0) ?? '—'}
                    <span className="tiny text-dim"> / 100</span>
                  </div>
                  <div className="tiny text-dim">{bundle.confidence?.band}</div>
                </div>
                <div className="kpi-tile">
                  <div className="label">vs random control</div>
                  <div className="value" style={{ fontSize: '1.05rem' }}>
                    {bundle.percentile_vs_control != null ? `p${bundle.percentile_vs_control.toFixed(0)}` : '—'}
                  </div>
                  <div className="tiny text-dim">
                    background {(bundle.control_context?.mean ?? 0).toFixed(1)} ± {(bundle.control_context?.std ?? 0).toFixed(1)}
                  </div>
                </div>
                <div className="kpi-tile">
                  <div className="label">Net of background</div>
                  <div className="value" style={{ fontSize: '1.05rem', color: (a.net_ndvi_change_land ?? 0) >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                    {(a.net_ndvi_change_land ?? 0) >= 0 ? '+' : ''}{(a.net_ndvi_change_land ?? 0).toFixed(3)}
                  </div>
                  <div className="tiny text-dim">
                    buffer {a.ndvi_change_land >= 0 ? '+' : ''}{a.ndvi_change_land?.toFixed(3)} − watershed {a.background?.ndvi_change >= 0 ? '+' : ''}{a.background?.ndvi_change?.toFixed(3)}
                  </div>
                </div>
              </div>
            )}

            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="kpi-tile">
                <div className="label"><Leaf size={10} /> ΔNDVI (land)</div>
                <div className="value" style={{ color: a.ndvi_change_land >= 0 ? 'var(--pos)' : 'var(--neg)', fontSize: '1.05rem' }}>
                  {a.ndvi_change_land >= 0 ? '+' : ''}{a.ndvi_change_land?.toFixed(3)}
                </div>
                <div className="note">{a.ndvi_before_land?.toFixed(3)} → {a.ndvi_after_land?.toFixed(3)}</div>
              </div>
              <div className="kpi-tile">
                <div className="label"><Droplets size={10} /> Δwater</div>
                <div className="value" style={{ color: a.water_area_change_ha >= 0 ? 'var(--secondary)' : 'var(--neg)', fontSize: '1.05rem' }}>
                  {a.water_area_change_ha >= 0 ? '+' : ''}{a.water_area_change_ha?.toFixed(2)}
                </div>
                <div className="note">{a.water_area_before_ha?.toFixed(2)} → {a.water_area_after_ha?.toFixed(2)} ha</div>
              </div>
              <div className="kpi-tile">
                <div className="label"><Mountain size={10} /> Improved</div>
                <div className="value" style={{ fontSize: '1.05rem' }}>{a.improved_pct}%</div>
                <div className="note">{a.area_improved_ha?.toFixed(2)} ha greened up</div>
              </div>
            </div>

            <div className="narrative-box">
              <b>Automated synthesis.</b> {a.interpretation}
            </div>

            <div>
              <div className="metric-title" style={{ marginBottom: 6 }}>Seasonal response inside the buffer</div>
              <div style={{ height: 150 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeseries} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.14)" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={(d) => String(d).slice(2, 7)} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,.25)', borderRadius: 8, fontSize: 11 }} />
                    <Line type="monotone" dataKey="ndvi" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="NDVI" />
                    <Line type="monotone" dataKey="water_area_ha" stroke="#38bdf8" strokeWidth={1.8} dot={{ r: 2.5 }} name="Water (ha)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {lulc?.classes && (
              <div>
                <div className="metric-title" style={{ marginBottom: 6 }}>Land cover transition inside the buffer</div>
                <table className="mini-table">
                  <thead>
                    <tr><th>Class</th><th>Baseline</th><th>Latest</th><th>Δ ha</th></tr>
                  </thead>
                  <tbody>
                    {lulc.classes.filter((c) => Math.abs(c.delta_ha) > 0.01 || c.t1_ha > 0.5).map((c) => (
                      <tr key={c.key}>
                        <td>
                          <span className="legend-swatch" style={{ background: c.color, display: 'inline-block', marginRight: 6 }} />
                          {c.label.split(' / ')[0]}
                        </td>
                        <td>{c.t0_ha.toFixed(2)}</td>
                        <td>{c.t1_ha.toFixed(2)}</td>
                        <td style={{ color: c.delta_ha > 0 ? 'var(--pos)' : c.delta_ha < 0 ? 'var(--neg)' : 'var(--text-muted)', fontWeight: 700 }}>
                          {c.delta_ha > 0 ? '+' : ''}{c.delta_ha.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="narrative-box warn" style={{ fontSize: '0.72rem' }}>
              <b>Scientific limitation.</b> Indicators describe a spatial association within
              {` ${radius} `}m of the structure, not proven causation. Seasonal rainfall,
              cropping change and other schemes are confounders; pixels converted to open
              water ({a.newly_inundated_ha?.toFixed(2) ?? 0} ha) are excluded from the
              land-only vegetation comparison.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
