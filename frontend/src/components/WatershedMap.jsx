import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, Circle, ImageOverlay } from 'react-leaflet';
import L from 'leaflet';

// Custom Leaflet Pin Icons
const createCustomIcon = (color, label) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        background: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 11px;
      ">${label}</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const iconCheckDam = createCustomIcon('#2980b9', 'CD');
const iconFarmPond = createCustomIcon('#16a085', 'FP');
const iconPlantation = createCustomIcon('#27ae60', 'PL');
const iconContourBund = createCustomIcon('#d35400', 'CB');
const iconPhoto = createCustomIcon('#ec4899', '📷');

export default function WatershedMap({
  watershedData,
  interventionsData,
  photosData,
  layers,
  selectedTimeframe,
  selectedIntervention,
  onSelectIntervention
}) {
  const mapRef = useRef(null);

  // Raster Bounds for Watershed 001
  // [south, west] to [north, east]
  const rasterBounds = [
    [19.835, 75.328],
    [19.855, 75.358]
  ];

  const getInterventionIcon = (type) => {
    switch (type) {
      case 'check_dam': return iconCheckDam;
      case 'farm_pond': return iconFarmPond;
      case 'plantation': return iconPlantation;
      case 'contour_bund': return iconContourBund;
      default: return iconCheckDam;
    }
  };

  // Static overlay URLs
  const ndviUrl = `/static/satellite/watershed_001/${selectedTimeframe === 't0' ? 'before' : 'after'}/ndvi.png`;
  const ndwiUrl = `/static/satellite/watershed_001/${selectedTimeframe === 't0' ? 'before' : 'after'}/ndwi.png`;
  const deltaUrl = `/static/satellite/watershed_001/after/ndvi_delta.png`;

  return (
    <div className="map-container-wrapper">
      <MapContainer
        center={[19.844, 75.343]}
        zoom={14}
        className="map-viewport"
        ref={mapRef}
      >
        {/* Dark Esri Basemap */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="&copy; Esri, Maxar, Earthstar Geographics"
        />

        {/* Boundary GeoJSON */}
        {layers.boundary && watershedData && watershedData.boundary && (
          <GeoJSON
            data={watershedData.boundary}
            style={{
              color: '#38bdf8',
              weight: 3,
              dashArray: '6, 6',
              fillColor: '#38bdf8',
              fillOpacity: 0.1
            }}
          />
        )}

        {/* Satellite Raster Overlays */}
        {layers.ndvi && (
          <ImageOverlay
            url={ndviUrl}
            bounds={rasterBounds}
            opacity={0.65}
          />
        )}

        {layers.ndwi && (
          <ImageOverlay
            url={ndwiUrl}
            bounds={rasterBounds}
            opacity={0.65}
          />
        )}

        {layers.delta && (
          <ImageOverlay
            url={deltaUrl}
            bounds={rasterBounds}
            opacity={0.7}
          />
        )}

        {/* Intervention Markers & 250m Buffer Circles */}
        {layers.interventions && interventionsData && interventionsData.features && (
          interventionsData.features.map((feat) => {
            const props = feat.properties;
            const isSelected = selectedIntervention && selectedIntervention.id === props.id;
            return (
              <React.Fragment key={props.id}>
                <Marker
                  position={[props.latitude, props.longitude]}
                  icon={getInterventionIcon(props.type)}
                  eventHandlers={{
                    click: () => onSelectIntervention(props)
                  }}
                >
                  <Popup>
                    <div style={{ color: '#1e293b', padding: '4px' }}>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{props.name}</strong><br />
                      <span style={{ fontSize: '12px', color: '#475569' }}>Type: {props.type.replace('_', ' ').toUpperCase()}</span><br />
                      <span style={{ fontSize: '12px', color: '#475569' }}>Date: {props.installation_date}</span><br />
                      <button
                        onClick={() => onSelectIntervention(props)}
                        style={{
                          marginTop: '8px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}
                      >
                        Inspect 250m Buffer & Photos
                      </button>
                    </div>
                  </Popup>
                </Marker>

                {/* 250m Impact Buffer Circle */}
                <Circle
                  center={[props.latitude, props.longitude]}
                  radius={250}
                  pathOptions={{
                    color: isSelected ? '#10b981' : '#f59e0b',
                    weight: isSelected ? 3 : 1.5,
                    dashArray: isSelected ? null : '4, 4',
                    fillColor: isSelected ? '#10b981' : '#f59e0b',
                    fillOpacity: isSelected ? 0.25 : 0.08
                  }}
                />
              </React.Fragment>
            );
          })
        )}

        {/* Geo-Coded Field Photo Pins */}
        {layers.photos && photosData && (
          photosData.map((photo) => (
            <Marker
              key={photo.photo_id}
              position={[parseFloat(photo.latitude), parseFloat(photo.longitude)]}
              icon={iconPhoto}
            >
              <Popup>
                <div style={{ width: '200px', color: '#1e293b' }}>
                  <img
                    src={photo.url}
                    alt={photo.photo_id}
                    style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px' }}
                  />
                  <div style={{ fontSize: '12px', marginTop: '6px' }}>
                    <strong>DRISHTI Field Photo</strong><br />
                    <span>Lat: {photo.latitude}° N</span><br />
                    <span>Lng: {photo.longitude}° E</span><br />
                    <span>Stamp: {photo.timestamp}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))
        )}
      </MapContainer>

      {/* Map Control Stats Overlay */}
      <div className="map-control-overlay">
        <div className="map-control-stat">
          <label>Selected Watershed</label>
          <span>MWS-MH-2025-014</span>
        </div>
        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>
        <div className="map-control-stat">
          <label>Observation Window</label>
          <span>{selectedTimeframe === 't0' ? 'Jun 2024 (T0)' : 'Jul 2025 (T1)'}</span>
        </div>
        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>
        <div className="map-control-stat">
          <label>Active Buffer</label>
          <span>250m Radius</span>
        </div>
      </div>
    </div>
  );
}
