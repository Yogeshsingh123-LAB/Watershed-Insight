import React from 'react';
import { X, FileText, MapPin, Calendar, CheckCircle2, ShieldAlert, Award } from 'lucide-react';

export default function InterventionModal({ interventionData, onClose, onGenerateReport, isGeneratingPdf }) {
  if (!interventionData) return null;

  const { intervention, analysis, matched_photos } = interventionData;
  const photo = matched_photos && matched_photos.length > 0 ? matched_photos[0] : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={20} color="#10b981" />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>{intervention.name}</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Intervention ID: {intervention.id} • Watershed: {intervention.watershed_id}
              </span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <div className="modal-body">
          {/* Left Column: Field Photo Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="panel-section-title">DRISHTI Field Evidence Photo</div>
            {photo ? (
              <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#0f172a' }}>
                <img
                  src={photo.url}
                  alt={photo.photo_id}
                  style={{ width: '100%', height: '220px', objectFit: 'cover' }}
                />
                <div style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div style={{ color: 'var(--text-main)', fontWeight: '600', marginBottom: '4px' }}>
                    Photo ID: {photo.photo_id}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <MapPin size={12} color="#10b981" /> GPS: {photo.latitude}° N, {photo.longitude}° E
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={12} color="#3b82f6" /> Captured: {photo.timestamp}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(15,23,42,0.6)', padding: '30px', borderRadius: '10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No DRISHTI field photo attached for this marker.
              </div>
            )}

            <div style={{ background: 'rgba(15,23,42,0.6)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
              <div style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>Structure Parameters</div>
              <div>Sanctioned Cost: <strong>₹ {intervention.cost_inr?.toLocaleString('en-IN')}</strong></div>
              <div>Storage Capacity: <strong>{intervention.capacity_tcm} TCM</strong></div>
              <div>Execution Status: <span style={{ color: '#34d399', fontWeight: 'bold' }}>{intervention.status}</span></div>
            </div>
          </div>

          {/* Right Column: 250m Buffer Satellite Analysis */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="panel-section-title">Satellite Indicator Analysis (250m Buffer)</div>

            {/* Indicators Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'rgba(15,23,42,0.8)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '8px', borderRadius: '6px 0 0 6px' }}>Indicator</th>
                  <th style={{ padding: '8px' }}>T0 (Pre: Jun 24)</th>
                  <th style={{ padding: '8px' }}>T1 (Post: Jul 25)</th>
                  <th style={{ padding: '8px', borderRadius: '0 6px 6px 0' }}>Delta</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: '600' }}>NDVI Vegetation Vigor</td>
                  <td style={{ padding: '10px 8px' }}>{analysis?.ndvi_before}</td>
                  <td style={{ padding: '10px 8px' }}>{analysis?.ndvi_after}</td>
                  <td style={{ padding: '10px 8px', color: '#34d399', fontWeight: 'bold' }}>+{(analysis?.ndvi_change || 0).toFixed(3)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: '600' }}>Surface Water Area (Ha)</td>
                  <td style={{ padding: '10px 8px' }}>{analysis?.water_area_before_ha} Ha</td>
                  <td style={{ padding: '10px 8px' }}>{analysis?.water_area_after_ha} Ha</td>
                  <td style={{ padding: '10px 8px', color: '#60a5fa', fontWeight: 'bold' }}>+{(analysis?.water_area_change_ha || 0).toFixed(2)} Ha</td>
                </tr>
              </tbody>
            </table>

            {/* Analytical Synthesis Note */}
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '14px', borderRadius: '10px', fontSize: '0.85rem' }}>
              <div style={{ color: '#34d399', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <CheckCircle2 size={16} /> Automated Evidence Synthesis
              </div>
              <p style={{ color: 'var(--text-main)', lineHeight: '1.4' }}>
                {analysis?.interpretation}
              </p>
            </div>

            {/* Disclaimers */}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(15,23,42,0.4)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <strong style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <ShieldAlert size={12} /> Scientific Limitation Note:
              </strong>
              Observed changes reflect spatial associations within 250m. Dates span pre-monsoon (T0) vs monsoon (T1) observations.
            </div>

            <button
              className="btn-primary"
              onClick={() => onGenerateReport(intervention.id)}
              disabled={isGeneratingPdf}
            >
              <FileText size={18} />
              {isGeneratingPdf ? 'Generating PDF Evidence Pack...' : 'Download PDF Evidence Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
