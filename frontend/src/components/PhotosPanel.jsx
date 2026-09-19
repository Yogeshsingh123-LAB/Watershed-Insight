import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Camera, CheckCircle2, CloudUpload, Crosshair, RefreshCw, Upload, X } from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

import api from '../api'

const QUALITY_CLASS = { verified: 'ok', acceptable: 'ok', questionable: 'bad' }

const COMPOSITION_COLORS = {
  vegetation: '#16a34a',
  water: '#0284c7',
  soil_or_earthwork: '#a16207',
  structure: '#57534e',
  sky: '#bae6fd',
  other: '#cbd5e1',
}

function CompositionBar({ composition }) {
  const entries = Object.entries(composition || {}).filter(([, v]) => v > 0)
  return (
    <div>
      <div className="composition-bar">
        {entries.map(([k, v]) => (
          <div key={k} style={{ width: `${v}%`, background: COMPOSITION_COLORS[k] || '#cbd5e1' }} title={`${k}: ${v}%`} />
        ))}
      </div>
      <div className="legend-inline">
        {entries.map(([k, v]) => (
          <span key={k}>
            <i style={{ background: COMPOSITION_COLORS[k] || '#cbd5e1' }} />
            {k.replace(/_/g, ' ')} {v}%
          </span>
        ))}
      </div>
    </div>
  )
}

export default function PhotosPanel({ watershedId, summary, selectedId, onSelect, onFly, notify }) {
  const [photos, setPhotos] = useState([])
  const [stats, setStats] = useState(null)
  const [filter, setFilter] = useState('all')      // all | verified | questionable | nogps
  const [intervention, setIntervention] = useState('')
  const [detail, setDetail] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const inputRef = useRef(null)

  const load = useCallback(async () => {
    if (!watershedId) return
    setLoading(true)
    try {
      const [list, st] = await Promise.all([
        api.photos({ watershed_id: watershedId }),
        api.photoStats(watershedId),
      ])
      setPhotos(list.photos || [])
      setStats(st)
    } catch (err) {
      notify?.(err.message || 'Failed to load photographs', 'error')
    } finally {
      setLoading(false)
    }
  }, [watershedId, notify])

  useEffect(() => { load() }, [load])

  const interventions = useMemo(
    () => (summary?.interventions?.features || []).map((f) => f.properties),
    [summary]
  )

  const visible = useMemo(() => {
    let list = photos
    if (intervention) list = list.filter((p) => p.intervention_id === intervention)
    if (filter === 'verified') list = list.filter((p) => p.quality === 'verified')
    if (filter === 'questionable') list = list.filter((p) => p.quality === 'questionable')
    if (filter === 'nogps') list = list.filter((p) => !p.has_gps)
    if (filter === 'outside') list = list.filter((p) => p.has_gps && !p.within_buffer)
    return list
  }, [photos, filter, intervention])

  const openDetail = async (photo) => {
    setDetail({ photo, interpretation: null })
    try {
      const interp = await api.interpretation(photo.photo_id)
      setDetail({ photo, interpretation: interp })
    } catch {
      setDetail({ photo, interpretation: null })
    }
  }

  const upload = async (files) => {
    if (!files?.length) return
    setUploading(true)
    const form = new FormData()
    files.forEach((f) => form.append('files', f))
    form.append('watershed_id', watershedId)
    if (intervention) form.append('intervention_id', intervention)
    try {
      const res = await api.uploadPhotos(form)
      notify?.(
        `${res.uploaded} photo(s) ingested` +
        (res.errors?.length ? `, ${res.errors.length} rejected` : ''),
        res.errors?.length ? 'error' : 'success'
      )
      await load()
    } catch (err) {
      notify?.(err.message || 'Upload failed', 'error')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files || []).filter((f) => /\.(jpe?g)$/i.test(f.name))
    if (files.length) upload(files)
    else notify?.('Only JPEG photographs are supported', 'error')
  }

  return (
    <div>
      {/* ------------------------- uploader ------------------------- */}
      <div
        className={`upload-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <RefreshCw className="spinner" size={20} color="#10b981" /> : <CloudUpload size={22} color="#10b981" />}
        <strong>Drop DRISHTI geo-tagged photographs</strong>
        <p>
          EXIF GPS + timestamp are read automatically, the photo is bound to the nearest
          structure and validated as evidence.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg"
          multiple
          hidden
          onChange={(e) => upload(Array.from(e.target.files || []))}
        />
      </div>

      {/* -------------------------- stats --------------------------- */}
      <div className="kpi-grid">
        <div className="kpi-tile">
          <div className="label">Photographs</div>
          <div className="value">{stats?.total ?? 0}</div>
          <div className="note">{stats?.baseline_records ?? 0} pre-works baselines</div>
        </div>
        <div className="kpi-tile">
          <div className="label">Machine-verified</div>
          <div className="value" style={{ color: 'var(--pos)' }}>{stats?.verified_pct ?? 0}%</div>
          <div className="note">{stats?.questionable ?? 0} flagged</div>
        </div>
      </div>

      {stats?.flags && Object.keys(stats.flags).length > 0 && (
        <div className="metric-card" style={{ padding: '10px 12px' }}>
          <div className="metric-title" style={{ marginBottom: 6 }}>Validation flags</div>
          {Object.entries(stats.flags)
            .sort((a, b) => b[1] - a[1])
            .map(([flag, count]) => (
              <div className="data-row" key={flag}>
                <span className="k" style={{ fontSize: '0.72rem' }}>{flag.replace(/_/g, ' ').toLowerCase()}</span>
                <span className={`chip ${flag === 'MISSING_GPS' || flag === 'OUTSIDE_BUFFER' || flag === 'BLURRED' ? 'badge-negative' : 'badge-amber'}`}>
                  {count}
                </span>
              </div>
            ))}
        </div>
      )}

      {/* ------------------------- filters -------------------------- */}
      <div className="section-block">
        <h4><Camera size={12} /> Geo-coded photo archive</h4>
        <div className="filter-group">
          <label>Bound structure</label>
          <select className="filter-select" value={intervention} onChange={(e) => setIntervention(e.target.value)}>
            <option value="">All structures</option>
            {interventions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
        <select className="filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All photographs ({photos.length})</option>
          <option value="verified">Verified evidence</option>
          <option value="questionable">Questionable</option>
          <option value="nogps">Missing GPS</option>
          <option value="outside">Outside the buffer</option>
        </select>
      </div>

      {/* ------------------------- gallery -------------------------- */}
      {loading && <div className="empty-state">Reading EXIF metadata…</div>}
      {!loading && visible.length === 0 && (
        <div className="empty-state">No photograph matches this filter.</div>
      )}

      <div className="photo-grid">
        {visible.map((p) => (
          <div
            key={p.photo_id}
            className="photo-tile"
            onClick={() => openDetail(p)}
            title="Open interpretation"
          >
            <img src={p.thumbnail_url || p.url} alt={p.photo_id} loading="lazy" />
            <span className={`flag ${QUALITY_CLASS[p.quality] || 'bad'}`}>
              {p.quality === 'verified' ? 'GPS ✓' : p.quality.toUpperCase()}
            </span>
            <div className="meta">
              <b>{p.intervention_id || 'unbound'}</b>
              {p.distance_to_intervention_m != null ? `${p.distance_to_intervention_m} m · ` : ''}
              {p.timestamp ? String(p.timestamp).slice(0, 10) : 'no timestamp'}
            </div>
          </div>
        ))}
      </div>

      {/* ------------------------- detail modal --------------------- */}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-content" style={{ width: 'min(760px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Camera size={19} color="#10b981" />
                <div>
                  <div style={{ fontWeight: 700 }}>{detail.photo.photo_id}</div>
                  <div className="tiny text-muted">
                    {detail.photo.intervention_id || 'Not bound to a structure'}
                    {detail.photo.distance_to_intervention_m != null
                      ? ` · ${detail.photo.distance_to_intervention_m} m away`
                      : ''}
                  </div>
                </div>
              </div>
              <button className="close-btn" onClick={() => setDetail(null)}><X size={20} /></button>
            </div>

            <div style={{ padding: 18, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <img
                  src={detail.photo.url}
                  alt={detail.photo.photo_id}
                  style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border-color)' }}
                />
                <div className="photo-meta" style={{ padding: '10px 0 0' }}>
                  <div className="row">📍 {detail.photo.latitude?.toFixed?.(6) ?? 'no GPS'}, {detail.photo.longitude?.toFixed?.(6) ?? ''}</div>
                  <div className="row">🕒 {detail.photo.timestamp ? String(detail.photo.timestamp).replace('T', ' ') : '—'}</div>
                  <div className="row">📷 {detail.photo.make || '—'} {detail.photo.model || ''}</div>
                  <div className="row">
                    {detail.photo.quality === 'verified'
                      ? <span className="chip badge-positive"><CheckCircle2 size={10} /> verified evidence</span>
                      : <span className="chip badge-negative"><AlertTriangle size={10} /> {detail.photo.validation?.join(', ') || 'questionable'}</span>}
                  </div>
                </div>
                <button
                  className="btn-ghost"
                  style={{ width: '100%', marginTop: 8 }}
                  onClick={() => {
                    onFly(detail.photo)
                    setDetail(null)
                  }}
                >
                  <Crosshair size={13} /> Zoom to capture point
                </button>
              </div>

              <div>
                <div className="panel-section-title">Automated content interpretation</div>
                {!detail.interpretation && <div className="empty-state">Interpreting image…</div>}
                {detail.interpretation?.available && (
                  <>
                    <div className="narrative-box info" style={{ marginBottom: 10 }}>
                      {detail.interpretation.label_text}
                      <div className="tiny" style={{ marginTop: 4, opacity: 0.85 }}>
                        confidence {detail.interpretation.confidence}
                        {detail.interpretation.quality_flags?.length
                          ? ` · flags: ${detail.interpretation.quality_flags.join(', ')}`
                          : ''}
                      </div>
                    </div>
                    <CompositionBar composition={detail.interpretation.composition_pct} />
                    <div className="data-row" style={{ marginTop: 8 }}>
                      <span className="k">Greenness index</span>
                      <span className="v">{detail.interpretation.greenness_index?.toFixed(3)}</span>
                    </div>
                    <div className="data-row">
                      <span className="k">Sharpness (Laplacian var.)</span>
                      <span className="v">{detail.interpretation.sharpness?.toFixed(5)}</span>
                    </div>
                    <div className="data-row">
                      <span className="k">Usable as evidence</span>
                      <span className="v" style={{ color: detail.interpretation.usable_as_evidence ? 'var(--pos)' : 'var(--neg)' }}>
                        {detail.interpretation.usable_as_evidence ? 'Yes' : 'No — re-capture'}
                      </span>
                    </div>
                    <div className="tiny text-dim" style={{ marginTop: 8 }}>
                      Fractions come from deterministic colour-index models (ExG, VARI,
                      blue-dominance) — no external vision service, fully reproducible.
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
