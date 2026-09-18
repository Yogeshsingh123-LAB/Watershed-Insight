import React from 'react';
import { Filter, Layers, Eye, Camera, Map, Calendar } from 'lucide-react';

export default function Sidebar({ layers, setLayers, selectedTimeframe, setSelectedTimeframe }) {
  const toggleLayer = (key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="sidebar-panel">
      <div>
        <div className="panel-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={14} /> Watershed Selector
        </div>
        
        <div className="filter-group">
          <label>State</label>
          <select className="filter-select">
            <option>Maharashtra</option>
          </select>
        </div>

        <div className="filter-group">
          <label>District</label>
          <select className="filter-select">
            <option>Chhatrapati Sambhajinagar</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Micro-Watershed</label>
          <select className="filter-select">
            <option>MWS-MH-2025-014 (Aurangabad North)</option>
          </select>
        </div>
      </div>

      <hr style={{ borderColor: 'var(--border-color)', margin: '4px 0' }} />

      <div>
        <div className="panel-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} /> Observation Date (T0 vs T1)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            onClick={() => setSelectedTimeframe('t0')}
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: selectedTimeframe === 't0' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
              background: selectedTimeframe === 't0' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-dark)',
              color: selectedTimeframe === 't0' ? '#34d399' : 'var(--text-muted)',
              fontWeight: '600',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            T0: Jun 2024<br/>
            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Pre-Intervention</span>
          </button>

          <button
            onClick={() => setSelectedTimeframe('t1')}
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: selectedTimeframe === 't1' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
              background: selectedTimeframe === 't1' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-dark)',
              color: selectedTimeframe === 't1' ? '#34d399' : 'var(--text-muted)',
              fontWeight: '600',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            T1: Jul 2025<br/>
            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Post-Intervention</span>
          </button>
        </div>
      </div>

      <hr style={{ borderColor: 'var(--border-color)', margin: '4px 0' }} />

      <div>
        <div className="panel-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={14} /> Web-GIS Layer Controls
        </div>

        <div className="layer-toggle-list">
          <div className={`layer-toggle-item ${layers.boundary ? 'active' : ''}`} onClick={() => toggleLayer('boundary')}>
            <div className="layer-info">
              <span className="layer-dot" style={{ background: '#3b82f6' }}></span>
              <span>Watershed Boundary</span>
            </div>
            <label className="switch">
              <input type="checkbox" checked={layers.boundary} onChange={() => {}} />
              <span className="slider"></span>
            </label>
          </div>

          <div className={`layer-toggle-item ${layers.interventions ? 'active' : ''}`} onClick={() => toggleLayer('interventions')}>
            <div className="layer-info">
              <span className="layer-dot" style={{ background: '#f59e0b' }}></span>
              <span>Intervention Markers</span>
            </div>
            <label className="switch">
              <input type="checkbox" checked={layers.interventions} onChange={() => {}} />
              <span className="slider"></span>
            </label>
          </div>

          <div className={`layer-toggle-item ${layers.photos ? 'active' : ''}`} onClick={() => toggleLayer('photos')}>
            <div className="layer-info">
              <span className="layer-dot" style={{ background: '#ec4899' }}></span>
              <span>DRISHTI Photo Pins</span>
            </div>
            <label className="switch">
              <input type="checkbox" checked={layers.photos} onChange={() => {}} />
              <span className="slider"></span>
            </label>
          </div>

          <div className={`layer-toggle-item ${layers.ndvi ? 'active' : ''}`} onClick={() => toggleLayer('ndvi')}>
            <div className="layer-info">
              <span className="layer-dot" style={{ background: '#10b981' }}></span>
              <span>NDVI Vegetation Raster</span>
            </div>
            <label className="switch">
              <input type="checkbox" checked={layers.ndvi} onChange={() => {}} />
              <span className="slider"></span>
            </label>
          </div>

          <div className={`layer-toggle-item ${layers.ndwi ? 'active' : ''}`} onClick={() => toggleLayer('ndwi')}>
            <div className="layer-info">
              <span className="layer-dot" style={{ background: '#06b6d4' }}></span>
              <span>NDWI Surface Water</span>
            </div>
            <label className="switch">
              <input type="checkbox" checked={layers.ndwi} onChange={() => {}} />
              <span className="slider"></span>
            </label>
          </div>

          <div className={`layer-toggle-item ${layers.delta ? 'active' : ''}`} onClick={() => toggleLayer('delta')}>
            <div className="layer-info">
              <span className="layer-dot" style={{ background: '#8b5cf6' }}></span>
              <span>Change Delta Map (T1-T0)</span>
            </div>
            <label className="switch">
              <input type="checkbox" checked={layers.delta} onChange={() => {}} />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </aside>
  );
}
