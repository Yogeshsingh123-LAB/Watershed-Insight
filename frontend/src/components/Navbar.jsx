import React from 'react';
import { Compass, MapPin, ShieldCheck, Layers } from 'lucide-react';

export default function Navbar({ selectedWatershed }) {
  return (
    <header className="navbar">
      <div className="navbar-brand">
        <div className="brand-icon">
          <Compass size={22} />
        </div>
        <div>
          <h1 className="brand-title">WATERSHED INSIGHT</h1>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '-2px' }}>
            Decision-Support Platform • PS26015
          </div>
        </div>
        <span className="brand-badge">DoLR • SRISHTI-DRISHTI ALIGNED</span>
      </div>

      <div className="navbar-actions">
        <div className="location-selector">
          <MapPin size={16} color="#10b981" />
          <span>Location: <strong>Maharashtra</strong> &rsaquo; <strong>Chhatrapati Sambhajinagar</strong> &rsaquo; <strong>MWS-MH-2025-014</strong></span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.8rem', color: '#34d399' }}>
          <ShieldCheck size={16} />
          <span>System Status: <strong>Live Ingestion Ready</strong></span>
        </div>
      </div>
    </header>
  );
}
