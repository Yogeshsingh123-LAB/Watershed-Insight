import React, { useEffect, useMemo, useRef } from 'react'
import {
  Circle, GeoJSON, ImageOverlay, LayerGroup, MapContainer, Marker, Polygon,
  Popup, TileLayer, Tooltip, useMap,
} from 'react-leaflet'
import L from 'leaflet'
import { Camera, Droplets, Gauge, Layers, Mountain, TrendingUp } from 'lucide-react'
import { createRoot } from 'react-dom/client'

const BASEMAPS = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
  },
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
  },
}

const TYPE_META = {
  check_dam: { code: 'CD', color: '#2980b9' },
  farm_pond: { code: 'FP', color: '#16a085' },
  percolation_tank: { code: 'PT', color: '#0e7490' },
  plantation: { code: 'PL', color: '#27ae60' },
  contour_bund: { code: 'CB', color: '#d35400' },
  gully_plug: { code: 'GP', color: '#9333ea' },
}

function pinIcon(color, label) {
  return L.divIcon({
    className: 'marker-pin',
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;
      border:2px solid white;box-shadow:0 3px 8px rgba(0,0,0,.55);display:flex;
      align-items:center;justify-content:center;color:white;font-weight:700;font-size:10px;
      font-family:'Plus Jakarta Sans',sans-serif">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  })
}

function photoIcon(url, valid) {
  return L.divIcon({
    className: 'photo-marker',
    html: `<img src="${url}" style="width:34px;height:34px;object-fit:cover;display:block" />`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
  })
}

/** Imperative helper: recentre / zoom the map when `focus` changes. */
function FocusController({ focus }) {
  const map = useMap()
  useEffect(() => {
    if (focus?.lat && focus?.lon) {
      map.flyTo([focus.lat, focus.lon], focus.zoom || 15, { duration: 0.9 })
    }
  }, [focus?.key, map]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

function InvalidateOnMount() {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200)
    return () => clearTimeout(t)
  }, [map])
  return null
}

/** Small stat chips floating over the map. */
function MapChips({ summary, layers }) {
  const stats = summary?.stats
  const active = Object.entries(layers).filter(([, v]) => v).length
  if (!stats) return null
  return (
    <div className="map-control-overlay map-topright">
      <div className="map-chip">
        <TrendingUp size={13} color="#34d399" />
        <span>ΔNDVI <b>{stats.ndvi_change >= 0 ? '+' : ''}{stats.ndvi_change?.toFixed(3)}</b></span>
      </div>
      <div className="map-chip">
        <Droplets size={13} color="#38bdf8" />
        <span>Water <b>{stats.water_area_ha_t1?.toFixed(1)} ha</b> ({stats.water_area_change_ha >= 0 ? '+' : ''}{stats.water_area_change_ha?.toFixed(1)})</span>
      </div>
      <div className="map-chip">
        <Layers size={13} color="#94a3b8" />
        <span><b>{active}</b> layers active</span>
      </div>
    </div>
  )
}

/** Colour-ramp legend for whichever raster layer is visible. */
function Legend({ layers, summary }) {
  const ramp = (colors) => ({
    background: `linear-gradient(90deg, ${colors.join(',')})`,
  })
  const lulcLegend = summary?.lulc?.legend || []

  let title = null
  let gradient = null
  let scale = null
  if (layers.ndvi) {
    title = 'NDVI (vegetation vigour)'
    gradient = ramp(['#a50026', '#fdae61', '#ffffbf', '#a6d96a', '#1a9850'])
    scale = ['-0.2', '0.9']
  } else if (layers.ndwi) {
    title = 'NDWI (surface water)'
    gradient = ramp(['#8c510a', '#dfc27d', '#f6e8c3', '#80cdc1', '#01665e'])
    scale = ['-0.6', '0.8']
  } else if (layers.delta) {
    title = 'ΔNDVI (T1 − T0)'
    gradient = ramp(['#b2182b', '#f4a582', '#f7f7f7', '#92c5de', '#2166ac'])
    scale = ['-0.35', '+0.35']
  }

  return (
    <div className="map-control-overlay map-legend">
      {title && (
        <>
          <h5>{title}</h5>
          <div className="legend-gradient" style={gradient} />
          <div className="legend-scale"><span>{scale[0]}</span><span>{scale[1]}</span></div>
        </>
      )}
      {layers.lulc && (
        <>
          <h5 style={{ marginTop: title ? 10 : 0 }}>Land use / land cover</h5>
          {lulcLegend.map((c) => (
            <div className="legend-row" key={c.key}>
              <span className="legend-swatch" style={{ background: c.color }} />
              {c.label}
            </div>
          ))}
        </>
      )}
      {!title && !layers.lulc && (
        <>
          <h5>Map legend</h5>
          <div className="legend-row"><span className="legend-swatch" style={{ background: '#38bdf8' }} />Watershed boundary</div>
          <div className="legend-row"><span className="legend-swatch" style={{ background: '#0ea5e9' }} />Drainage network</div>
          <div className="legend-row"><span className="legend-swatch" style={{ background: '#f59e0b' }} />Interventions</div>
          <div className="legend-row"><span className="legend-swatch" style={{ background: '#fb7185' }} />Geo-coded photos</div>
        </>
      )}
    </div>
  )
}

export default function MapView({
  summary, overlays, layers, basemap, interventions, photos,
  selectedId, onSelect, focus, radius, opacity, catchment, hotspots, loading,
}) {
  const bounds = overlays?.bounds || summary?.overlay_bounds
  const centre = summary?.watershed?.centre || [19.8445, 75.343]
  const overlayUrl = (name) => overlays?.overlays?.[name]

  const interventionIcons = useMemo(() => {
    const map = {}
    Object.entries(TYPE_META).forEach(([type, meta]) => {
      map[type] = pinIcon(meta.color, meta.code)
    })
    return map
  }, [])

  const streamStyle = (feature) => ({
    color: '#0ea5e9',
    weight: Math.min(1 + (feature?.properties?.order || 1) * 0.9, 4.5),
    opacity: 0.85,
  })

  const hotspotBlocks = hotspots?.blocks || []

  return (
    <div className="map-container-wrapper">
      <MapContainer
        center={centre}
        zoom={14}
        className="map-viewport"
        preferCanvas
        zoomControl
      >
        <TileLayer key={basemap} url={BASEMAPS[basemap].url} attribution={BASEMAPS[basemap].attribution} />
        <FocusController focus={focus} />
        <InvalidateOnMount />

        {/* --------------------- raster overlays --------------------- */}
        {bounds && layers.hillshade && overlayUrl('hillshade') && (
          <ImageOverlay url={overlayUrl('hillshade')} bounds={bounds} opacity={Math.min(opacity, 0.6)} zIndex={200} />
        )}
        {bounds && layers.ndvi && overlayUrl('ndvi') && (
          <ImageOverlay url={overlayUrl('ndvi')} bounds={bounds} opacity={opacity} zIndex={220} />
        )}
        {bounds && layers.ndwi && overlayUrl('ndwi') && (
          <ImageOverlay url={overlayUrl('ndwi')} bounds={bounds} opacity={opacity} zIndex={221} />
        )}
        {bounds && layers.delta && overlayUrl('delta') && (
          <ImageOverlay url={overlayUrl('delta')} bounds={bounds} opacity={opacity} zIndex={222} />
        )}
        {bounds && layers.lulc && overlayUrl('lulc') && (
          <ImageOverlay url={overlayUrl('lulc')} bounds={bounds} opacity={opacity} zIndex={223} />
        )}
        {bounds && layers.slope && overlayUrl('slope') && (
          <ImageOverlay url={overlayUrl('slope')} bounds={bounds} opacity={opacity} zIndex={224} />
        )}

        {/* ------------------- boundary & drainage ------------------- */}
        {layers.boundary && summary?.watershed?.boundary && (
          <GeoJSON
            data={summary.watershed.boundary}
            style={{ color: '#38bdf8', weight: 2.5, dashArray: '7,6', fillColor: '#38bdf8', fillOpacity: 0.06 }}
          />
        )}

        {layers.streams && summary?.terrain && (
          <DrainageLayer streams={summary.streams} style={streamStyle} />
        )}

        {/* ---------------------- interventions --------------------- */}
        {layers.interventions && (
          <LayerGroup>
            {interventions.map((item) => {
              const meta = TYPE_META[item.type] || TYPE_META.check_dam
              const selected = item.id === selectedId
              return (
                <React.Fragment key={item.id}>
                  <Marker
                    position={[item.latitude, item.longitude]}
                    icon={interventionIcons[item.type] || interventionIcons.check_dam}
                    eventHandlers={{ click: () => onSelect(item.id, { open: true }) }}
                    zIndexOffset={selected ? 800 : 400}
                  >
                    <Tooltip direction="top" offset={[0, -16]}>
                      {item.name} · ₹{Number(item.cost_inr || 0).toLocaleString('en-IN')}
                    </Tooltip>
                    <Popup>
                      <div style={{ color: '#e2e8f0', minWidth: 210 }}>
                        <strong style={{ fontSize: 13 }}>{item.name}</strong><br />
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                          {item.type.replace(/_/g, ' ')} · {item.status} · {item.installation_date}
                        </span><br />
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                          Capacity {item.capacity_tcm || 0} TCM · ₹{Number(item.cost_inr || 0).toLocaleString('en-IN')}
                        </span>
                        <button
                          onClick={() => onSelect(item.id, { open: true })}
                          style={{
                            marginTop: 8, width: '100%', background: '#10b981', color: '#04211a',
                            border: 'none', padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
                            fontSize: 11, fontWeight: 700,
                          }}
                        >
                          Inspect {radius} m buffer & evidence
                        </button>
                      </div>
                    </Popup>
                  </Marker>

                  {layers.buffers && (
                    <Circle
                      center={[item.latitude, item.longitude]}
                      radius={radius}
                      pathOptions={{
                        color: selected ? '#10b981' : meta.color,
                        weight: selected ? 2.5 : 1,
                        dashArray: selected ? null : '5,5',
                        fillColor: selected ? '#10b981' : meta.color,
                        fillOpacity: selected ? 0.16 : 0.05,
                      }}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </LayerGroup>
        )}

        {/* ------------------- geo-coded photo pins ------------------ */}
        {layers.photos && photos?.features && (
          <LayerGroup>
            {photos.features.map((f) => {
              const p = f.properties
              const valid = p.quality === 'verified'
              return (
                <Marker
                  key={p.photo_id}
                  position={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
                  icon={photoIcon(p.thumbnail_url || p.url, valid)}
                  zIndexOffset={300}
                >
                  <Popup>
                    <div style={{ color: '#e2e8f0', width: 180 }}>
                      <img
                        src={p.thumbnail_url || p.url}
                        alt={p.photo_id}
                        style={{ width: '100%', height: 96, objectFit: 'cover', borderRadius: 6 }}
                      />
                      <div style={{ marginTop: 6, fontSize: 11 }}>
                        <strong>{p.photo_id}</strong><br />
                        <span style={{ color: '#94a3b8' }}>
                          {p.timestamp ? String(p.timestamp).replace('T', ' ') : 'no timestamp'}<br />
                          {p.intervention_id || 'unbound'}
                          {p.distance_m != null ? ` · ${p.distance_m} m` : ''}
                        </span><br />
                        <span style={{ color: valid ? '#6ee7b7' : '#fcd34d', fontWeight: 700 }}>
                          {p.quality}
                          {p.validation?.length ? ` (${p.validation.join(', ')})` : ''}
                        </span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </LayerGroup>
        )}

        {/* ---------------------- catchment ------------------------- */}
        {layers.catchment && catchment?.catchment?.geometry?.coordinates?.[0]?.length > 2 && (
          <Polygon
            positions={catchment.catchment.geometry.coordinates[0].map(([lon, lat]) => [lat, lon])}
            pathOptions={{ color: '#a78bfa', weight: 2, dashArray: '6,4', fillColor: '#a78bfa', fillOpacity: 0.14 }}
          >
            <Popup>
              <div style={{ color: '#e2e8f0', fontSize: 12 }}>
                <strong>Upstream contributing area</strong><br />
                {catchment.catchment.area_ha} ha draining to this structure<br />
                <span style={{ color: '#94a3b8' }}>
                  Delineated from the DEM (D8 flow routing)
                </span>
              </div>
            </Popup>
          </Polygon>
        )}

        {/* ---------------------- hotspots -------------------------- */}
        {layers.hotspots && hotspotBlocks.length > 0 && (
          <LayerGroup>
            {hotspotBlocks.map((b, i) => {
              const delta = b.mean_delta || 0
              if (Math.abs(delta) < 0.02) return null
              const strong = Math.abs(delta) > 0.1
              return (
                <Circle
                  key={`hs-${i}`}
                  center={[b.lat, b.lon]}
                  radius={Math.sqrt((b.area_ha || 25) * 10000 / Math.PI)}
                  pathOptions={{
                    color: delta > 0 ? '#10b981' : '#f43f5e',
                    weight: strong ? 2 : 1,
                    fillColor: delta > 0 ? '#10b981' : '#f43f5e',
                    fillOpacity: strong ? 0.28 : 0.12,
                  }}
                >
                  <Tooltip direction="top">
                    ΔNDVI {delta > 0 ? '+' : ''}{delta.toFixed(3)} · {b.area_ha?.toFixed(1)} ha
                  </Tooltip>
                </Circle>
              )
            })}
          </LayerGroup>
        )}
      </MapContainer>

      <MapChips summary={summary} layers={layers} />
      <Legend layers={layers} summary={summary} />

      {loading && (
        <div className="map-loading">
          <span className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
          Recomputing spatial analytics…
        </div>
      )}
    </div>
  )
}

/** Drainage network needs its own fetch: it is large, so it is loaded lazily. */
function DrainageLayer({ streams, style }) {
  if (!streams?.features?.length) return null
  return <GeoJSON data={streams} style={style} />
}
