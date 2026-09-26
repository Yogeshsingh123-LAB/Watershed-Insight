import React, { useEffect, useMemo, useState } from 'react'
import {
  Circle, GeoJSON, ImageOverlay, LayerGroup, MapContainer, Marker, Polygon,
  Popup, TileLayer, Tooltip, useMap,
} from 'react-leaflet'
import L from 'leaflet'
import { Camera, ChevronDown, Compass, Droplets, Layers, Locate, Maximize2, Move, Layers3 } from 'lucide-react'

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

function FocusController({ focus }) {
  const map = useMap()
  useEffect(() => {
    if (focus?.lat && focus?.lon) {
      map.flyTo([focus.lat, focus.lon], focus.zoom || 15, { duration: 0.9 })
    }
  }, [focus?.key, map])
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

export default function MapView({
  summary, overlays, layers, setLayers = () => {}, basemap, setBasemap = () => {}, interventions, photos,
  selectedId, onSelect, focus, radius, opacity, catchment, hotspots, loading,
}) {
  const bounds = overlays?.bounds || summary?.overlay_bounds
  const centre = summary?.watershed?.centre || [19.8445, 75.343]
  const overlayUrl = (name) => overlays?.overlays?.[name]

  // Active primary raster overlay selection
  const [activeRaster, setActiveRaster] = useState('ndvi')

  const interventionIcons = useMemo(() => {
    const map = {}
    Object.entries(TYPE_META).forEach(([type, meta]) => {
      map[type] = pinIcon(meta.color, meta.code)
    })
    return map
  }, [])

  const handleRasterChange = (key) => {
    setActiveRaster(key)
    setLayers((prev) => ({
      ...prev,
      ndvi: key === 'ndvi',
      ndwi: key === 'ndwi',
      lulc: key === 'lulc',
      slope: key === 'slope',
      hillshade: key === 'elevation' || key === 'slope',
      interventions: key === 'structures' || prev.interventions,
    }))
  }

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-200 shadow-sm flex flex-col">
      {/* Leaflet Viewport */}
      <MapContainer
        center={centre}
        zoom={14}
        className="w-full h-full z-0"
        preferCanvas
        zoomControl={false}
      >
        <TileLayer key={basemap} url={BASEMAPS[basemap]?.url || BASEMAPS.satellite.url} attribution={BASEMAPS[basemap]?.attribution || BASEMAPS.satellite.attribution} />
        <FocusController focus={focus} />
        <InvalidateOnMount />

        {/* Raster Overlays */}
        {bounds && (layers.hillshade || activeRaster === 'elevation') && overlayUrl('hillshade') && (
          <ImageOverlay url={overlayUrl('hillshade')} bounds={bounds} opacity={Math.min(opacity, 0.6)} zIndex={200} />
        )}
        {bounds && (layers.ndvi || activeRaster === 'ndvi') && overlayUrl('ndvi') && (
          <ImageOverlay url={overlayUrl('ndvi')} bounds={bounds} opacity={opacity} zIndex={220} />
        )}
        {bounds && (layers.ndwi || activeRaster === 'ndwi') && overlayUrl('ndwi') && (
          <ImageOverlay url={overlayUrl('ndwi')} bounds={bounds} opacity={opacity} zIndex={221} />
        )}
        {bounds && (layers.lulc || activeRaster === 'lulc') && overlayUrl('lulc') && (
          <ImageOverlay url={overlayUrl('lulc')} bounds={bounds} opacity={opacity} zIndex={223} />
        )}
        {bounds && (layers.slope || activeRaster === 'slope') && overlayUrl('slope') && (
          <ImageOverlay url={overlayUrl('slope')} bounds={bounds} opacity={opacity} zIndex={224} />
        )}

        {/* Watershed Boundary Polygon */}
        {(layers.boundary ?? true) && summary?.watershed?.boundary && (
          <GeoJSON
            data={summary.watershed.boundary}
            style={{ color: '#eab308', weight: 2.8, dashArray: '7,4', fillColor: '#eab308', fillOpacity: 0.05 }}
          />
        )}

        {/* Drainage Network */}
        {layers.streams && summary?.streams && (
          <GeoJSON
            data={summary.streams}
            style={(f) => ({
              color: '#0ea5e9',
              weight: Math.min(1 + (f?.properties?.order || 1) * 0.9, 4.5),
              opacity: 0.85,
            })}
          />
        )}

        {/* Interventions Markers */}
        {(layers.interventions ?? true) && (
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
                      <div className="text-slate-800 text-xs p-1 min-w-[200px]">
                        <strong className="text-slate-900 font-bold">{item.name}</strong>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.type.replace(/_/g, ' ')} · {item.status} · {item.installation_date}
                        </div>
                        <button
                          onClick={() => onSelect(item.id, { open: true })}
                          className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2 rounded text-xs transition-colors cursor-pointer"
                        >
                          Inspect Structure Evidence
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              )
            })}
          </LayerGroup>
        )}
      </MapContainer>

      {/* Floating Left Toolbar Tools */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col bg-white border border-slate-200 rounded-lg shadow-md overflow-hidden text-slate-700">
        <button className="p-2 hover:bg-slate-100 border-b border-slate-200 font-bold text-base cursor-pointer" title="Zoom In">+</button>
        <button className="p-2 hover:bg-slate-100 border-b border-slate-200 font-bold text-base cursor-pointer" title="Zoom Out">−</button>
        <button className="p-2 hover:bg-slate-100 border-b border-slate-200 cursor-pointer" title="Center Map"><Locate size={15} /></button>
        <button className="p-2 hover:bg-slate-100 border-b border-slate-200 cursor-pointer" title="Switch Basemap"><Layers3 size={15} /></button>
        <button className="p-2 hover:bg-slate-100 cursor-pointer" title="Measure Area"><Move size={15} /></button>
      </div>

      {/* Floating Top Right Basemap Selector */}
      <div className="absolute top-4 right-4 z-[400]">
        <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-1.5 flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800 hover:bg-slate-50">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Satellite View</span>
          <ChevronDown size={14} className="text-slate-400" />
        </div>
      </div>

      {/* Floating Right Layer Panel (exact match to screenshot) */}
      <div className="absolute top-14 right-4 z-[400] bg-white border border-slate-200 rounded-xl shadow-lg p-3.5 w-60 text-xs flex flex-col gap-2 select-none">
        <div className="flex flex-col gap-1.5">
          {[
            { id: 'ndvi', label: 'NDVI (Vegetation)', color: '#10b981' },
            { id: 'ndwi', label: 'Surface Water', color: '#0ea5e9' },
            { id: 'lulc', label: 'Land Use / Land Cover', color: '#eab308' },
            { id: 'elevation', label: 'Elevation (DEM)', color: '#8b5cf6' },
            { id: 'slope', label: 'Soil Type', color: '#f97316' },
            { id: 'structures', label: 'Intervention Structures', color: '#047857' },
          ].map((item) => (
            <label key={item.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded-md transition-colors">
              <input
                type="radio"
                name="map_layer_radio"
                checked={activeRaster === item.id}
                onChange={() => handleRasterChange(item.id)}
                className="text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
              />
              <span className={`font-semibold ${activeRaster === item.id ? 'text-slate-900 font-bold' : 'text-slate-600'}`}>
                {item.label}
              </span>
            </label>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-2 flex flex-col gap-1.5 mt-1">
          <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded-md">
            <input
              type="checkbox"
              checked={!!layers.village}
              onChange={(e) => setLayers((prev) => ({ ...prev, village: e.target.checked }))}
              className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
            />
            <span className="font-medium text-slate-700">Village Boundary</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded-md">
            <input
              type="checkbox"
              checked={layers.boundary !== false}
              onChange={(e) => setLayers((prev) => ({ ...prev, boundary: e.target.checked }))}
              className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
            />
            <span className="font-bold text-slate-900">Watershed Boundary</span>
          </label>
        </div>
      </div>

      {/* Floating Bottom Left NDVI Legend Bar */}
      <div className="absolute bottom-4 left-4 z-[400] bg-white border border-slate-200 rounded-lg shadow-md p-2.5 flex flex-col gap-1 text-[11px] w-64 select-none">
        <span className="font-bold text-slate-800 text-[11px]">NDVI (Vegetation Vigour)</span>
        <div
          className="h-2.5 rounded-full w-full"
          style={{ background: 'linear-gradient(90deg, #a50026 0%, #fdae61 25%, #ffffbf 50%, #a6d96a 75%, #1a9850 100%)' }}
        />
        <div className="flex justify-between font-mono text-[10px] text-slate-500 font-semibold">
          <span>-0.2</span>
          <span>0.9</span>
        </div>
      </div>

      {/* Floating Bottom Right Map Scale */}
      <div className="absolute bottom-3 right-4 z-[400] bg-slate-900/80 text-white border border-slate-700 rounded px-2 py-0.5 text-[10px] font-mono flex items-center gap-2">
        <span className="border-b-2 border-white w-8 text-center font-bold">500 m</span>
        <span className="text-slate-400">Leaflet | Esri, Maxar, Earthstar Geographics</span>
      </div>
    </div>
  )
}
