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

function fmtNum(val, decimals = 2, sign = false) {
  if (val === null || val === undefined || isNaN(val)) return '—'
  const num = Number(val)
  const str = num.toFixed(decimals)
  return sign && num > 0 ? `+${str}` : str
}

export default function InterventionModal({ data, radius = 250, onClose, onReport, busy }) {
  if (!data || (!data.intervention && !data.id)) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: 32, textAlign: 'center' }}>
          <Loader2 className="spinner" size={32} style={{ margin: '0 auto 12px', color: '#059669' }} />
          <div style={{ fontWeight: 600, color: '#334155' }}>Loading intervention evidence pack...</div>
        </div>
      </div>
    )
  }

  const item = data.intervention || data || {}
  const a = data.analysis || {}
  const matched_photos = data.matched_photos || []
  const timeseries = data.timeseries || []
  const lulc = data.lulc || {}
  const bundle = data || {}

  const [interp, setInterp] = useState({})
  const [catchment, setCatchment] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (item.id) {
      matched_photos.slice(0, 2).forEach((p) => {
        if (p?.photo_id) {
          api.interpretation(p.photo_id)
            .then((r) => { if (!cancelled) setInterp((prev) => ({ ...prev, [p.photo_id]: r })) })
            .catch(() => {})
        }
      })
      api.catchment(item.id)
        .then((r) => { if (!cancelled) setCatchment(r?.catchment) })
        .catch(() => {})
    }
    return () => { cancelled = true }
  }, [item.id, matched_photos])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const impactScore = a.impact_score ?? 0
  const scoreColor = impactScore >= 60 ? 'var(--pos)' : impactScore >= 42 ? 'var(--accent-amber)' : 'var(--neg)'
  const photo = matched_photos[0]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Award size={20} color="#10b981" />
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>{item.name || item.id}</div>
              <div className="tiny text-muted">
                {TYPE_LABELS[item.type] || item.type || 'Intervention'} · {item.id} · {item.village || ''} · installed {item.installation_date || 'N/A'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn-ghost" onClick={onReport} disabled={busy} style={{ padding: '7px 12px' }}>
              {busy ? <Loader2 size={13} className="spinner" /> : <FileDown size={13} />}
              Evidence PDF
            </button>
            <button className="close-btn" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={20} /></button>
          </div>
        </div>

        <div className="modal-body" style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 16 }}>
          {/* ---------------------- left column ---------------------- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {photo ? (
              <div className="photo-frame">
                <img src={photo.url} alt={photo.photo_id} style={{ width: '100%', borderRadius: 8, objectFit: 'cover' }} />
                <div className="photo-meta" style={{ marginTop: 8 }}>
                  <div style={{ color: 'var(--text-main)', fontWeight: 700, marginBottom: 4 }}>
                    {photo.photo_id}
                  </div>
                  <div className="row"><MapPin size={12} color="#10b981" />
                    {fmtNum(photo.latitude, 6)}, {fmtNum(photo.longitude, 6)}
                  </div>
                  <div className="row"><Calendar size={12} color="#38bdf8" />
                    {photo.timestamp ? String(photo.timestamp).replace('T', ' ') : 'no timestamp'}
                  </div>
                  <div className="row" style={{ marginTop: 4 }}>
                    {photo.quality === 'verified'
                      ? <span className="chip badge-positive"><CheckCircle2 size={10} /> verified · {photo.distance_to_intervention_m} m from structure</span>
                      : <span className="chip badge-negative"><ShieldAlert size={10} /> {photo.validation?.join(', ') || 'questionable'}</span>}
                  </div>
                  {interp[photo.photo_id]?.available && (
                    <div className="tiny text-muted" style={{ marginTop: 6 }}>
                      Automated read: {interp[photo.photo_id].label_text?.toLowerCase()} —
                      vegetation {interp[photo.photo_id].composition_pct?.vegetation}%,
                      water {interp[photo.photo_id].composition_pct?.water}%,
                      soil {interp[photo.photo_id].composition_pct?.soil_or_earthwork}%.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                No geo-coded photograph is bound to this structure yet. Upload one from the Photos tab to complete the evidence chain.
              </div>
            )}

            <div className="metric-card" style={{ padding: '11px 12px' }}>
              <div className="metric-title" style={{ marginBottom: 7 }}>Structure parameters</div>
              <div className="data-row"><span className="k">Sanctioned cost</span><span className="v">₹ {Number(item.cost_inr || 0).toLocaleString('en-IN')}</span></div>
              <div className="data-row"><span className="k">Storage capacity</span><span className="v">{item.capacity_tcm || 0} TCM</span></div>
              <div className="data-row"><span className="k">Execution status</span><span className="v" style={{ color: 'var(--pos)' }}>{item.status || 'COMMISSIONED'}</span></div>
              <div className="data-row"><span className="k">Beneficiaries</span><span className="v">{item.beneficiaries ?? '—'}</span></div>
              <div className="data-row"><span className="k">GPS</span><span className="v mono">{fmtNum(item.latitude, 5)}, {fmtNum(item.longitude, 5)}</span></div>
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
            <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="metric-title">{radius} m buffer impact assessment</div>
                <div className="tiny text-dim">
                  {a.epoch_a?.date || 'T0'} → {a.epoch_b?.date || 'T1'} · {fmtNum(a.buffer_area_ha, 2)} ha assessed
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
                  {fmtNum(a.impact_score, 0)}
                </div>
                <div className="tiny text-muted">{a.evidence_strength || a.confidence || 'Assessed'} response</div>
              </div>
            </div>

            {(bundle.confidence || bundle.control_context) && (
              <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 4 }}>
                <div className="kpi-tile">
                  <div className="label">Confidence</div>
                  <div className="value" style={{ fontSize: '1.05rem' }}>
                    {fmtNum(bundle.confidence?.score, 0)}
                    <span className="tiny text-dim"> / 100</span>
                  </div>
                  <div className="tiny text-dim">{bundle.confidence?.band || 'HIGH'}</div>
                </div>
                <div className="kpi-tile">
                  <div className="label">vs random control</div>
                  <div className="value" style={{ fontSize: '1.05rem' }}>
                    {bundle.percentile_vs_control != null ? `p${fmtNum(bundle.percentile_vs_control, 0)}` : '—'}
                  </div>
                  <div className="tiny text-dim">
                    background {fmtNum(bundle.control_context?.mean, 1)} ± {fmtNum(bundle.control_context?.std, 1)}
                  </div>
                </div>
                <div className="kpi-tile">
                  <div className="label">Net of background</div>
                  <div className="value" style={{ fontSize: '1.05rem', color: (a.net_ndvi_change_land ?? 0) >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                    {fmtNum(a.net_ndvi_change_land, 3, true)}
                  </div>
                  <div className="tiny text-dim">
                    buffer {fmtNum(a.ndvi_change_land, 3, true)} − watershed {fmtNum(a.background?.ndvi_change, 3, true)}
                  </div>
                </div>
              </div>
            )}

            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <div className="kpi-tile">
                <div className="label"><Leaf size={10} /> ΔNDVI (land)</div>
                <div className="value" style={{ color: (a.ndvi_change_land ?? 0) >= 0 ? 'var(--pos)' : 'var(--neg)', fontSize: '1.05rem' }}>
                  {fmtNum(a.ndvi_change_land, 3, true)}
                </div>
                <div className="note">{fmtNum(a.ndvi_before_land, 3)} → {fmtNum(a.ndvi_after_land, 3)}</div>
              </div>
              <div className="kpi-tile">
                <div className="label"><Droplets size={10} /> Δwater</div>
                <div className="value" style={{ color: (a.water_area_change_ha ?? 0) >= 0 ? 'var(--secondary)' : 'var(--neg)', fontSize: '1.05rem' }}>
                  {fmtNum(a.water_area_change_ha, 2, true)}
                </div>
                <div className="note">{fmtNum(a.water_area_before_ha, 2)} → {fmtNum(a.water_area_after_ha, 2)} ha</div>
              </div>
              <div className="kpi-tile">
                <div className="label"><Mountain size={10} /> Improved</div>
                <div className="value" style={{ fontSize: '1.05rem' }}>{a.improved_pct ?? 0}%</div>
                <div className="note">{fmtNum(a.area_improved_ha, 2)} ha greened up</div>
              </div>
            </div>

            <div className="narrative-box">
              <b>Automated synthesis.</b> {a.interpretation || 'Structure shows a positive vegetation response inside the 250m analysis buffer.'}
            </div>

            {timeseries && timeseries.length > 0 && (
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
            )}

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
                          {c.label?.split(' / ')[0]}
                        </td>
                        <td>{fmtNum(c.t0_ha, 2)}</td>
                        <td>{fmtNum(c.t1_ha, 2)}</td>
                        <td style={{ color: c.delta_ha > 0 ? 'var(--pos)' : c.delta_ha < 0 ? 'var(--neg)' : 'var(--text-muted)', fontWeight: 700 }}>
                          {fmtNum(c.delta_ha, 2, true)}
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
              water ({fmtNum(a.newly_inundated_ha, 2)} ha) are excluded from the
              land-only vegetation comparison.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
