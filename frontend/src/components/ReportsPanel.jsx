import React, { useCallback, useEffect, useState } from 'react'
import { Download, FileText, History, Loader2, MapPinned, RefreshCw } from 'lucide-react'

import api from '../api'

const REPORT_TYPES = [
  {
    kind: 'intervention',
    title: 'Intervention Evidence Pack',
    icon: MapPinned,
    description:
      'Single-structure dossier: location map, buffer indicator table, LULC transition, seasonal '
      + 'response curve, geo-coded photographs with EXIF stamps and automated synthesis.',
    needsSelection: true,
  },
  {
    kind: 'watershed',
    title: 'Micro-Watershed Assessment',
    icon: FileText,
    description:
      'Full watershed report: KPI dashboard, thematic maps, LULC change, change detection, '
      + 'intervention ranking with recommendations, photo evidence audit and next actions.',
    needsSelection: false,
  },
]

export default function ReportsPanel({ watershedId, summary, selectedId, radius, onDownload, busy }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.listReports()
      setHistory(res.reports || [])
    } catch {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])
  useEffect(() => { if (busy === false) loadHistory() }, [busy, loadHistory])

  const ranking = summary?.ranking || []
  const high = ranking.filter((r) => r.impact_score >= 60).length
  const inspect = ranking.filter((r) => r.impact_score < 42).length

  return (
    <div>
      <div className="section-block">
        <h4><FileText size={12} /> Evidence generator</h4>
        <div className="tiny text-muted" style={{ marginBottom: 10, lineHeight: 1.6 }}>
          Reports are generated on demand from live analytics — every number, map and
          photograph is rendered from the current dataset, so the PDF and the dashboard can
          never disagree.
        </div>

        {REPORT_TYPES.map(({ kind, title, icon: Icon, description, needsSelection }) => {
          const target = kind === 'intervention' ? selectedId : watershedId
          const disabled = !target || busy
          return (
            <div className="metric-card" key={kind} style={{ padding: '11px 12px' }}>
              <div className="metric-card-header">
                <div className="flex" style={{ gap: 7 }}>
                  <Icon size={15} color="#10b981" />
                  <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{title}</span>
                </div>
                {kind === 'intervention' && (
                  <span className="chip badge-neutral">{radius} m buffer</span>
                )}
              </div>
              <div className="tiny text-muted" style={{ lineHeight: 1.55 }}>{description}</div>
              {kind === 'intervention' && !selectedId && (
                <div className="tiny" style={{ color: 'var(--accent-amber)', marginTop: 6 }}>
                  Select a structure on the map first.
                </div>
              )}
              {kind === 'intervention' && selectedId && (
                <div className="tiny text-dim" style={{ marginTop: 6 }}>
                  Target: <b className="mono">{selectedId}</b>
                </div>
              )}
              <button
                className="btn-primary"
                style={{ marginTop: 9 }}
                disabled={disabled}
                onClick={() => onDownload(kind, target)}
              >
                {busy ? <Loader2 size={14} className="spinner" /> : <Download size={14} />}
                Generate PDF
              </button>
            </div>
          )
        })}
      </div>

      <div className="section-block">
        <h4>Contents of the assessment report</h4>
        <div className="data-row"><span className="k">Structures assessed</span><span className="v">{ranking.length}</span></div>
        <div className="data-row"><span className="k">High-impact (replicate)</span><span className="v" style={{ color: 'var(--pos)' }}>{high}</span></div>
        <div className="data-row"><span className="k">Flagged for inspection</span><span className="v" style={{ color: 'var(--accent-amber)' }}>{inspect}</span></div>
        <div className="data-row"><span className="k">Photographs audited</span><span className="v">{summary?.photo_stats?.total ?? 0}</span></div>
        <div className="data-row"><span className="k">Epochs analysed</span><span className="v">{summary?.epochs?.length ?? 0}</span></div>
      </div>

      <div className="section-block">
        <div className="flex-between">
          <h4 style={{ margin: 0 }}><History size={12} /> Recently generated</h4>
          <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: '0.68rem' }} onClick={loadHistory} disabled={loading}>
            <RefreshCw size={11} /> Refresh
          </button>
        </div>

        {history.length === 0 && (
          <div className="empty-state">
            No document generated yet in this session. Generated PDFs are stored in
            <span className="mono"> reports/generated/</span>.
          </div>
        )}
        {history.map((r) => (
          <div className="metric-card" key={r.filename} style={{ padding: '9px 11px' }}>
            <div className="flex-between">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.filename}
                </div>
                <div className="tiny text-dim">
                  {r.size_kb} KB · {new Date(r.modified * 1000).toLocaleString()}
                </div>
              </div>
              <a className="btn-ghost" style={{ padding: '5px 9px' }} href={r.url} target="_blank" rel="noreferrer">
                <Download size={12} /> Open
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="narrative-box muted">
        Every document carries the methodology, the exact thresholds used (NDWI &gt; 0.10 for
        surface water, {radius} m buffer) and the scientific limitations of the assessment, so
        it can be filed as defensible evidence in a WCDC review.
      </div>
    </div>
  )
}
