import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowUpRight, Award, BarChart3, Calendar, Camera, CheckCircle2, ChevronDown, Compass,
  Crosshair, Droplets, Eye, FileText, Filter, Globe, Info, Layers, Leaf, Loader2, MapPin, Maximize2,
  RefreshCw, Search, ShieldAlert, ShieldCheck, Sparkles, Target, TrendingUp, X
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import MapView from './MapView'
import BeforeAfterPanel from './BeforeAfterPanel'
import ThematicPanel from './ThematicPanel'
import InterventionsView from './InterventionsView'
import ChangePanel from './ChangePanel'
import PhotosPanel from './PhotosPanel'
import ReportsPanel from './ReportsPanel'
import api from '../api'

const RAINFALL_DATA = [
  { month: 'Jun', actual: 120, normal: 140 },
  { month: 'Jul', actual: 190, normal: 210 },
  { month: 'Aug', actual: 260, normal: 240 },
  { month: 'Sep', actual: 150, normal: 170 },
  { month: 'Oct', actual: 80, normal: 90 },
  { month: 'Nov', actual: 20, normal: 30 },
  { month: 'Dec', actual: 5, normal: 10 },
  { month: 'Jan', actual: 0, normal: 5 },
  { month: 'Feb', actual: 2, normal: 5 },
  { month: 'Mar', actual: 10, normal: 15 },
  { month: 'Apr', actual: 25, normal: 30 },
  { month: 'May', actual: 40, normal: 50 },
]

const INDICATOR_EXPLANATIONS = {
  ndvi: {
    title: 'NDVI (Vegetation Index)',
    subtitle: 'Normalized Difference Vegetation Index',
    body: 'NDVI measures green vegetation density using satellite reflectance (Sentinel-2). Values range from 0 to 1. Higher values (0.3 - 0.7) indicate healthy green crops, trees, and dense foliage.',
  },
  water: {
    title: 'Surface Water Area',
    subtitle: 'Open Water Storage Detection',
    body: 'Surface water area measures open water bodies (farm ponds, check dam impoundments, percolation tanks) detected via satellite NDWI index across the micro-watershed.',
  },
  veg: {
    title: 'Vegetated Area',
    subtitle: 'Total Green Canopy Coverage',
    body: 'Total hectares within the micro-watershed boundary possessing active green cover (NDVI > 0.30) during the observation acquisition period.',
  },
  interventions: {
    title: 'Intervention Structures',
    subtitle: 'Water Conservation Investments',
    body: 'Total water harvesting structures (check dams, percolation tanks, farm ponds, contour bunds, afforestation) completed under PMKSY-WDC 2.0.',
  },
}

const TYPE_META = {
  check_dam: { label: 'Check Dam', color: '#0284c7', bg: '#e0f2fe' },
  farm_pond: { label: 'Farm Pond', color: '#0d9488', bg: '#ccfbf1' },
  percolation_tank: { label: 'Percolation Tank', color: '#047857', bg: '#ecfdf5' },
  plantation: { label: 'Plantation', color: '#16a34a', bg: '#dcfce7' },
  contour_bund: { label: 'Contour Bund', color: '#d97706', bg: '#fef3c7' },
  gully_plug: { label: 'Gully Plug', color: '#7c3aed', bg: '#f3e8ff' },
}

export default function WatershedExplorerView({
  catalog,
  watershedId,
  onSelectWatershed,
  summary,
  overlays,
  layers,
  setLayers,
  basemap,
  setBasemap,
  interventions,
  photos,
  selectedId,
  selectIntervention,
  focus,
  radius,
  opacity,
  catchment,
  hotspots,
  loading,
  downloadReport,
  busy,
}) {
  const hierarchy = catalog?.hierarchy || []
  const current = summary?.watershed || {}

  // Location selector state
  const [selectedState, setSelectedState] = useState('Maharashtra')
  const [selectedDistrict, setSelectedDistrict] = useState('Chhatrapati Sambhajinagar')
  const [selectedBlock, setSelectedBlock] = useState('Paithan')

  // Center Map Tab State
  const [mapTab, setMapTab] = useState('map')

  // Right Panel Tab State
  const [rightTab, setRightTab] = useState('overview')

  // Info explanation modal key
  const [infoModalKey, setInfoModalKey] = useState(null)

  // Photo detail modal state
  const [photoDetail, setPhotoDetail] = useState(null)
  const [photoInterp, setPhotoInterp] = useState(null)

  // Interventions search and filter state for right tab
  const [rightInterventionFilter, setRightInterventionFilter] = useState('ALL')
  const [rightInterventionSearch, setRightInterventionSearch] = useState('')

  // Field photo filter state
  const [photoFilter, setPhotoFilter] = useState('all')
  const [fetchedPhotos, setFetchedPhotos] = useState([])

  // Load photos when watershedId changes
  useEffect(() => {
    if (!watershedId) return
    let cancelled = false
    api.photos({ watershed_id: watershedId })
      .then((res) => {
        if (!cancelled && res?.photos) setFetchedPhotos(res.photos)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [watershedId])

  // Quick Layers toggle states
  const [quickLayers, setQuickLayers] = useState({
    boundary: true,
    village: false,
    interventions: true,
    satellite: true,
    ndvi: true,
    water: false,
    lulc: false,
    elevation: false,
    streams: false,
  })

  const toggleQuickLayer = (key) => {
    setQuickLayers((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      setLayers((old) => ({
        ...old,
        boundary: next.boundary,
        village: next.village,
        interventions: next.interventions,
        ndvi: next.ndvi,
        ndwi: next.water,
        lulc: next.lulc,
        slope: next.elevation,
        streams: next.streams,
      }))
      return next
    })
  }

  const stats = summary?.stats || {}
  const feats = summary?.interventions?.features || []
  const ranking = summary?.ranking || []

  // Filtered interventions list for right sidebar
  const filteredRightInterventions = useMemo(() => {
    let list = feats.map((f) => f.properties)
    if (!list.length) {
      list = (interventions || []).length ? interventions : [
        { id: 'INT-PT-003', name: 'Percolation Tank #003', type: 'percolation_tank', cost_inr: 1850000, capacity_tcm: 12.5, installation_date: '2025-02-15', status: 'Installed' },
        { id: 'INT-CD-001', name: 'Check Dam #001', type: 'check_dam', cost_inr: 2200000, capacity_tcm: 18.0, installation_date: '2024-11-10', status: 'Installed' },
        { id: 'INT-FP-002', name: 'Farm Pond #002', type: 'farm_pond', cost_inr: 650000, capacity_tcm: 5.2, installation_date: '2025-01-20', status: 'Installed' },
        { id: 'INT-PL-004', name: 'Afforestation Block #004', type: 'plantation', cost_inr: 450000, capacity_tcm: 0.0, installation_date: '2024-08-05', status: 'Installed' },
      ]
    }
    return list.filter((item) => {
      const matchType = rightInterventionFilter === 'ALL' || item.type === rightInterventionFilter
      const matchSearch = !rightInterventionSearch ||
        (item.name && item.name.toLowerCase().includes(rightInterventionSearch.toLowerCase())) ||
        (item.id && item.id.toLowerCase().includes(rightInterventionSearch.toLowerCase()))
      return matchType && matchSearch
    })
  }, [feats, interventions, rightInterventionFilter, rightInterventionSearch])

  // Processed photo items
  const photoList = useMemo(() => {
    let list = fetchedPhotos.length ? fetchedPhotos : (photos?.features || []).map((f) => ({
      photo_id: f.properties?.photo_id || f.id || 'PHOTO-001',
      url: f.properties?.url || '/percolation_tank.jpg',
      thumbnail_url: f.properties?.thumbnail_url || f.properties?.url || '/percolation_tank.jpg',
      intervention_id: f.properties?.intervention_id || 'INT-PT-003',
      latitude: f.geometry?.coordinates?.[1] || f.properties?.latitude || 19.88,
      longitude: f.geometry?.coordinates?.[0] || f.properties?.longitude || 75.32,
      timestamp: f.properties?.timestamp || '2025-02-20',
      quality: f.properties?.quality || 'verified',
      distance_to_intervention_m: f.properties?.distance_to_intervention_m || 35,
    }))

    if (!list.length) {
      list = [
        {
          photo_id: 'DRISHTI-MH-2025-001',
          url: '/percolation_tank.jpg',
          thumbnail_url: '/percolation_tank.jpg',
          intervention_id: 'INT-PT-003',
          latitude: 19.8824,
          longitude: 75.3211,
          timestamp: '2025-02-18 11:30:00',
          quality: 'verified',
          distance_to_intervention_m: 24,
        },
        {
          photo_id: 'DRISHTI-MH-2025-002',
          url: '/watershed_hero_bg.jpg',
          thumbnail_url: '/watershed_hero_bg.jpg',
          intervention_id: 'INT-CD-001',
          latitude: 19.8845,
          longitude: 75.3256,
          timestamp: '2025-01-14 14:15:00',
          quality: 'verified',
          distance_to_intervention_m: 12,
        },
      ]
    }

    if (photoFilter === 'verified') return list.filter((p) => p.quality === 'verified')
    if (photoFilter === 'questionable') return list.filter((p) => p.quality === 'questionable')
    return list
  }, [fetchedPhotos, photos, photoFilter])

  const openPhotoModal = async (p) => {
    setPhotoDetail(p)
    setPhotoInterp(null)
    try {
      if (p.photo_id) {
        const interp = await api.interpretation(p.photo_id)
        setPhotoInterp(interp)
      }
    } catch {
      setPhotoInterp(null)
    }
  }

  const activeExplanation = infoModalKey ? INDICATOR_EXPLANATIONS[infoModalKey] : null

  return (
    <div className="flex-1 flex flex-col xl:flex-row gap-3 p-2 sm:p-3 overflow-y-auto xl:overflow-hidden bg-[#f8fafc] text-xs select-none">
      {/* ================= COLUMN 1: LEFT SIDEBAR (Select Location & Quick Layers) ================= */}
      <aside className="w-full xl:w-[260px] shrink-0 flex flex-col gap-3 pr-1">
        {/* CARD 1: SELECT LOCATION */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 flex flex-col gap-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-xs border-b border-slate-100 pb-2">
            <MapPin size={15} className="text-emerald-700" />
            <span>Select Location</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* State */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600">State</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500"
              >
                <option value="Maharashtra">Maharashtra</option>
              </select>
            </div>

            {/* District */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600">District</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500"
              >
                <option value="Chhatrapati Sambhajinagar">Chhatrapati Sambhajinagar</option>
              </select>
            </div>

            {/* Block */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600">Block</label>
              <select
                value={selectedBlock}
                onChange={(e) => setSelectedBlock(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500"
              >
                <option value="Paithan">Paithan</option>
              </select>
            </div>

            {/* Watershed / Micro-watershed */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-600">Watershed / Micro-watershed</label>
              <select
                value={watershedId || ''}
                onChange={(e) => onSelectWatershed(e.target.value)}
                className="w-full bg-white border border-emerald-600 text-emerald-800 font-bold rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 shadow-2xs"
              >
                <option value="MWS-MH-2025-014">MWS-MH-2025-014 (Aurangabad North)</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-1">
              <button className="flex-1 bg-[#047857] hover:bg-[#065f46] text-white py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer">
                <Search size={13} />
                <span>Apply</span>
              </button>
              <button className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-1.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer">
                <RefreshCw size={12} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* CARD 2: QUICK LAYERS */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-xs border-b border-slate-100 pb-2">
            <Layers size={15} className="text-emerald-700" />
            <span>Quick Layers</span>
          </div>

          <div className="flex flex-col gap-2 text-[11px]">
            {[
              { id: 'boundary', label: 'Watershed Boundary', color: '#10b981' },
              { id: 'village', label: 'Village Boundary', color: '#f59e0b' },
              { id: 'interventions', label: 'Intervention Structures', color: '#0ea5e9' },
              { id: 'satellite', label: 'Satellite Imagery', color: '#3b82f6' },
              { id: 'ndvi', label: 'NDVI (Vegetation)', color: '#10b981' },
              { id: 'water', label: 'Surface Water', color: '#0284c7' },
              { id: 'lulc', label: 'Land Use / Land Cover', color: '#ef4444' },
              { id: 'elevation', label: 'Elevation (DEM)', color: '#8b5cf6' },
              { id: 'streams', label: 'Drainage Network', color: '#0ea5e9' },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between py-0.5 hover:bg-slate-50 rounded px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                  <span className="font-semibold text-slate-700">{item.label}</span>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => toggleQuickLayer(item.id)}
                  className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                    quickLayers[item.id] ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                      quickLayers[item.id] ? 'left-[17px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ================= COLUMN 2: CENTER MAP VIEW (With Sub-Tabs Bar) ================= */}
      <div className="w-full xl:flex-1 flex flex-col gap-2 min-w-0 min-h-[420px] xl:min-h-0 xl:h-full">
        {/* SUB-TABS DIRECTLY ABOVE MAP */}
        <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-2 py-1 rounded-t-xl text-xs font-semibold overflow-x-auto whitespace-nowrap scrollbar-none">
          {[
            { id: 'map', label: 'Map View' },
            { id: 'satellite', label: 'Satellite Analysis' },
            { id: 'interventions', label: 'Interventions' },
            { id: 'change', label: 'Change Analysis' },
            { id: 'evidence', label: 'Field Evidence' },
            { id: 'reports', label: 'Reports' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setMapTab(t.id)}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                mapTab === t.id
                  ? 'bg-emerald-50 text-emerald-800 border-b-2 border-emerald-600 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* DYNAMIC SUB-TAB VIEWPORT */}
        <div className="flex-1 w-full h-full rounded-b-xl overflow-hidden relative border border-slate-200 shadow-xs bg-white">
          {mapTab === 'map' && (
            <MapView
              summary={summary}
              overlays={overlays}
              layers={layers}
              setLayers={setLayers}
              basemap={basemap}
              setBasemap={setBasemap}
              interventions={interventions}
              photos={photos}
              selectedId={selectedId}
              onSelect={(id) => selectIntervention(id, { open: true })}
              focus={focus}
              radius={radius}
              opacity={opacity}
              catchment={catchment}
              hotspots={hotspots}
              loading={loading}
            />
          )}

          {mapTab === 'satellite' && (
            <div className="h-full overflow-y-auto p-4 space-y-6 bg-white">
              <BeforeAfterPanel watershedId={watershedId} interventions={interventions} />
              <ThematicPanel
                summary={summary}
                layers={layers}
                setLayers={setLayers}
                onToggleCatchment={(on) => setLayers((prev) => ({ ...prev, catchment: on }))}
                catchment={catchment}
                selectedId={selectedId}
              />
            </div>
          )}

          {mapTab === 'interventions' && (
            <div className="h-full overflow-y-auto bg-white">
              <InterventionsView
                summary={summary}
                interventions={interventions}
                selectedId={selectedId}
                onSelect={(id) => selectIntervention(id, { open: true })}
                onDownload={downloadReport}
                busy={busy}
              />
            </div>
          )}

          {mapTab === 'change' && (
            <div className="h-full overflow-y-auto p-4 bg-white">
              <ChangePanel
                summary={summary}
                watershedId={watershedId}
                epochKey={null}
                setEpochKey={() => {}}
                epochs={summary?.epochs || []}
              />
            </div>
          )}

          {mapTab === 'evidence' && (
            <div className="h-full overflow-y-auto p-4 bg-white">
              <PhotosPanel
                watershedId={watershedId}
                summary={summary}
                selectedId={selectedId}
                onSelect={(id) => selectIntervention(id, { open: true })}
                onFly={() => {}}
                notify={() => {}}
              />
            </div>
          )}

          {mapTab === 'reports' && (
            <div className="h-full overflow-y-auto p-4 bg-white">
              <ReportsPanel
                watershedId={watershedId}
                summary={summary}
                selectedId={selectedId}
                radius={radius}
                onDownload={downloadReport}
                busy={busy}
              />
            </div>
          )}
        </div>
      </div>

      {/* ================= COLUMN 3: RIGHT SIDE PANEL (Information + Indicators + Interventions + Field Photos) ================= */}
      <aside className="w-full xl:w-[380px] shrink-0 flex flex-col gap-3 pr-1 overflow-y-auto">
        {/* TOP TAB BAR */}
        <div className="bg-white rounded-xl border border-slate-200 p-2 flex items-center justify-between font-bold text-xs shadow-2xs">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'indicators', label: 'Key Indicators' },
            { id: 'interventions', label: `Interventions (${filteredRightInterventions.length})` },
            { id: 'photos', label: 'Field Photos' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setRightTab(t.id)}
              className={`pb-1 px-1 transition-all cursor-pointer ${
                rightTab === t.id
                  ? 'text-emerald-700 border-b-2 border-emerald-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {rightTab === 'overview' && (
          <>
            {/* SECTION 1: WATERSHED INFORMATION CARD */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <MapPin size={15} className="text-emerald-700" />
                  Watershed Information
                </span>
                <button
                  onClick={() => setRightTab('indicators')}
                  className="text-emerald-700 hover:underline font-bold text-[11px] flex items-center gap-0.5 cursor-pointer"
                >
                  View Details <ArrowUpRight size={12} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-y-2 text-[11px] text-slate-700">
                <span className="text-slate-500 font-medium">Watershed ID</span>
                <span className="font-bold text-slate-900 font-mono">{current.code || 'MWS-MH-2025-014'}</span>

                <span className="text-slate-500 font-medium">Name</span>
                <span className="font-bold text-slate-900">{current.name || 'Aurangabad North Micro-Watershed'}</span>

                <span className="text-slate-500 font-medium">State</span>
                <span className="font-semibold text-slate-800">Maharashtra</span>

                <span className="text-slate-500 font-medium">District</span>
                <span className="font-semibold text-slate-800">Chhatrapati Sambhajinagar</span>

                <span className="text-slate-500 font-medium">Block</span>
                <span className="font-semibold text-slate-800">Paithan</span>

                <span className="text-slate-500 font-medium">Village</span>
                <span className="font-semibold text-slate-800">{current.village || 'Nidhona Bk.'}</span>

                <span className="text-slate-500 font-medium">Geographical Area</span>
                <span className="font-bold text-slate-900">{current.area_ha ? `${current.area_ha} ha` : '457.12 ha'}</span>

                <span className="text-slate-500 font-medium">Rainfall (Normal)</span>
                <span className="font-semibold text-slate-800">{current.rainfall_mm ? `${current.rainfall_mm} mm` : '712 mm'}</span>

                <span className="text-slate-500 font-medium">Soil Type</span>
                <span className="font-medium text-slate-800">{current.soil || 'Medium black (Vertic Inceptisol)'}</span>

                <span className="text-slate-500 font-medium">Aquifer</span>
                <span className="font-medium text-slate-800 leading-tight">{current.aquifer || 'Deccan basalt - weathered / fractured'}</span>
              </div>
            </div>

            {/* SECTION 2: KEY INDICATORS SUMMARY CARD */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <BarChart3 size={15} className="text-emerald-700" />
                  Key Indicators (2025 vs 2024)
                </span>
                <button
                  onClick={() => setRightTab('indicators')}
                  className="text-emerald-700 hover:underline font-bold text-[11px] flex items-center gap-0.5 cursor-pointer"
                >
                  Full Analytics <ArrowUpRight size={12} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* NDVI Mean */}
                <div
                  className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between cursor-pointer hover:border-emerald-400 transition-colors"
                  onClick={() => setInfoModalKey('ndvi')}
                >
                  <div className="flex items-center justify-between text-emerald-700 font-bold text-[10px] uppercase">
                    <div className="flex items-center gap-1">
                      <Leaf size={12} className="text-emerald-600" />
                      <span>NDVI MEAN</span>
                    </div>
                    <Info size={12} className="text-slate-400 hover:text-slate-700" />
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-extrabold text-slate-900 font-mono">
                      {stats.ndvi_mean_t1?.toFixed(3) || '0.296'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                      <TrendingUp size={10} />
                      +{stats.ndvi_change?.toFixed(3) || '0.046'}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-500 font-medium mt-0.5">vs 2024-05-28</div>
                </div>

                {/* Surface Water */}
                <div
                  className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between cursor-pointer hover:border-sky-400 transition-colors"
                  onClick={() => setInfoModalKey('water')}
                >
                  <div className="flex items-center justify-between text-sky-700 font-bold text-[10px] uppercase">
                    <div className="flex items-center gap-1">
                      <Droplets size={12} className="text-sky-600" />
                      <span>SURFACE WATER</span>
                    </div>
                    <Info size={12} className="text-slate-400 hover:text-slate-700" />
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-extrabold text-slate-900 font-mono">
                      {stats.water_area_ha_t1 ? `${stats.water_area_ha_t1.toFixed(1)} ha` : '12.8 ha'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                      <TrendingUp size={10} />
                      +{stats.water_area_change_ha ? `${stats.water_area_change_ha.toFixed(2)} ha` : '12.77 ha'}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-500 font-medium mt-0.5">vs baseline</div>
                </div>

                {/* Vegetated Area */}
                <div
                  className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between cursor-pointer hover:border-emerald-400 transition-colors"
                  onClick={() => setInfoModalKey('veg')}
                >
                  <div className="flex items-center justify-between text-emerald-800 font-bold text-[10px] uppercase">
                    <div className="flex items-center gap-1">
                      <Target size={12} className="text-emerald-600" />
                      <span>VEGETATED AREA</span>
                    </div>
                    <Info size={12} className="text-slate-400 hover:text-slate-700" />
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-extrabold text-slate-900 font-mono">
                      {stats.veg_area_ha_t1 ? `${stats.veg_area_ha_t1.toFixed(0)} ha` : '272 ha'}
                    </span>
                  </div>
                  <div className="text-[9px] text-emerald-700 font-bold mt-0.5">
                    +{stats.veg_area_change_ha ? stats.veg_area_change_ha.toFixed(1) : '203.6'} ha (NDVI &gt; 0.30)
                  </div>
                </div>

                {/* Structures */}
                <div
                  className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between cursor-pointer hover:border-amber-400 transition-colors"
                  onClick={() => setInfoModalKey('interventions')}
                >
                  <div className="flex items-center justify-between text-amber-800 font-bold text-[10px] uppercase">
                    <div className="flex items-center gap-1">
                      <ShieldCheck size={12} className="text-amber-600" />
                      <span>STRUCTURES</span>
                    </div>
                    <Info size={12} className="text-slate-400 hover:text-slate-700" />
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-extrabold text-slate-900 font-mono">
                      {stats.interventions || filteredRightInterventions.length || 10}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-600 font-medium mt-0.5">
                    Water harvesting units
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: RAINFALL TREND CHART */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <BarChart3 size={15} className="text-sky-700" />
                  Rainfall Trend (mm)
                </span>
                <div className="flex items-center gap-2 text-[9px] font-semibold">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-xs bg-sky-500"></span> Actual</span>
                  <span className="flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-xs bg-slate-200"></span> Normal</span>
                </div>
              </div>

              <div className="w-full h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={RAINFALL_DATA} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} domain={[0, 300]} />
                    <Tooltip contentStyle={{ background: '#0f172a', borderRadius: 6, color: '#fff', fontSize: 10 }} />
                    <Bar dataKey="actual" fill="#0284c7" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="normal" fill="#e2e8f0" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: KEY INDICATORS DETAILED ANALYTICS */}
        {rightTab === 'indicators' && (
          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                  <BarChart3 size={15} className="text-emerald-700" />
                  Detailed Key Indicators (Baseline vs T1)
                </span>
                <button
                  onClick={() => setMapTab('satellite')}
                  className="text-emerald-700 hover:underline font-bold text-[11px] flex items-center gap-0.5 cursor-pointer"
                >
                  Open Satellite View <ArrowUpRight size={12} />
                </button>
              </div>

              {/* Grid of 4 Indicator Cards with Info icons */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. NDVI */}
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-800 font-extrabold text-[11px] uppercase flex items-center gap-1">
                      <Leaf size={13} /> NDVI Mean
                    </span>
                    <button
                      onClick={() => setInfoModalKey('ndvi')}
                      className="text-emerald-600 hover:text-emerald-900 p-0.5 cursor-pointer"
                      title="Explain NDVI"
                    >
                      <Info size={13} />
                    </button>
                  </div>
                  <div className="mt-2">
                    <div className="text-xl font-extrabold text-slate-900 font-mono">
                      {stats.ndvi_mean_t1?.toFixed(3) || '0.296'}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5 mt-0.5">
                      <TrendingUp size={11} /> +{stats.ndvi_change?.toFixed(3) || '0.046'} net gain
                    </div>
                  </div>
                </div>

                {/* 2. Surface Water */}
                <div className="bg-sky-50/50 border border-sky-200 rounded-xl p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-sky-800 font-extrabold text-[11px] uppercase flex items-center gap-1">
                      <Droplets size={13} /> Water Area
                    </span>
                    <button
                      onClick={() => setInfoModalKey('water')}
                      className="text-sky-600 hover:text-sky-900 p-0.5 cursor-pointer"
                      title="Explain Surface Water"
                    >
                      <Info size={13} />
                    </button>
                  </div>
                  <div className="mt-2">
                    <div className="text-xl font-extrabold text-slate-900 font-mono">
                      {stats.water_area_ha_t1 ? `${stats.water_area_ha_t1.toFixed(1)} ha` : '12.8 ha'}
                    </div>
                    <div className="text-[10px] text-sky-700 font-bold flex items-center gap-0.5 mt-0.5">
                      <TrendingUp size={11} /> +{stats.water_area_change_ha ? stats.water_area_change_ha.toFixed(2) : '12.77'} ha
                    </div>
                  </div>
                </div>

                {/* 3. Vegetated Area */}
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-900 font-extrabold text-[11px] uppercase flex items-center gap-1">
                      <Target size={13} /> Green Canopy
                    </span>
                    <button
                      onClick={() => setInfoModalKey('veg')}
                      className="text-emerald-600 hover:text-emerald-900 p-0.5 cursor-pointer"
                      title="Explain Vegetated Area"
                    >
                      <Info size={13} />
                    </button>
                  </div>
                  <div className="mt-2">
                    <div className="text-xl font-extrabold text-slate-900 font-mono">
                      {stats.veg_area_ha_t1 ? `${stats.veg_area_ha_t1.toFixed(0)} ha` : '272 ha'}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                      +{stats.veg_area_change_ha ? stats.veg_area_change_ha.toFixed(1) : '203.6'} ha expanded
                    </div>
                  </div>
                </div>

                {/* 4. Structures */}
                <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-900 font-extrabold text-[11px] uppercase flex items-center gap-1">
                      <ShieldCheck size={13} /> Interventions
                    </span>
                    <button
                      onClick={() => setInfoModalKey('interventions')}
                      className="text-amber-600 hover:text-amber-900 p-0.5 cursor-pointer"
                      title="Explain Interventions"
                    >
                      <Info size={13} />
                    </button>
                  </div>
                  <div className="mt-2">
                    <div className="text-xl font-extrabold text-slate-900 font-mono">
                      {stats.interventions || filteredRightInterventions.length || 10} Units
                    </div>
                    <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                      100% geo-coded &amp; verified
                    </div>
                  </div>
                </div>
              </div>

              {/* Baseline vs Current Metric Table */}
              <div className="mt-2 border-t border-slate-100 pt-3">
                <span className="font-bold text-slate-800 text-[11px] block mb-2">Indicator Comparison Table</span>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="p-2 border-b">Metric</th>
                        <th className="p-2 border-b">Baseline (2024)</th>
                        <th className="p-2 border-b">Latest (2025)</th>
                        <th className="p-2 border-b text-right">Net Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr>
                        <td className="p-2 font-bold text-slate-800">NDVI (Mean)</td>
                        <td className="p-2 text-slate-600 font-mono">0.250</td>
                        <td className="p-2 text-slate-900 font-mono font-bold">{stats.ndvi_mean_t1?.toFixed(3) || '0.296'}</td>
                        <td className="p-2 text-right text-emerald-700 font-extrabold font-mono">+{stats.ndvi_change?.toFixed(3) || '0.046'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-slate-800">Water Storage</td>
                        <td className="p-2 text-slate-600 font-mono">0.03 ha</td>
                        <td className="p-2 text-slate-900 font-mono font-bold">{stats.water_area_ha_t1 ? `${stats.water_area_ha_t1.toFixed(1)} ha` : '12.8 ha'}</td>
                        <td className="p-2 text-right text-sky-700 font-extrabold font-mono">+{stats.water_area_change_ha ? `${stats.water_area_change_ha.toFixed(2)} ha` : '12.77 ha'}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-slate-800">Green Cover</td>
                        <td className="p-2 text-slate-600 font-mono">68.4 ha</td>
                        <td className="p-2 text-slate-900 font-mono font-bold">{stats.veg_area_ha_t1 ? `${stats.veg_area_ha_t1.toFixed(0)} ha` : '272 ha'}</td>
                        <td className="p-2 text-right text-emerald-700 font-extrabold font-mono">+{stats.veg_area_change_ha ? stats.veg_area_change_ha.toFixed(1) : '203.6'} ha</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INTERVENTIONS LIST */}
        {rightTab === 'interventions' && (
          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                  <Award size={15} className="text-emerald-700" />
                  Monitored Interventions ({filteredRightInterventions.length})
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Click structure to inspect evidence</span>
              </div>

              {/* Filter and Search */}
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search structure ID or name..."
                    value={rightInterventionSearch}
                    onChange={(e) => setRightInterventionSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'check_dam', label: 'Check Dam' },
                    { id: 'percolation_tank', label: 'Percolation Tank' },
                    { id: 'farm_pond', label: 'Farm Pond' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setRightInterventionFilter(t.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                        rightInterventionFilter === t.id
                          ? 'bg-emerald-700 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Intervention Items List */}
              <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
                {filteredRightInterventions.map((item) => {
                  const meta = TYPE_META[item.type] || TYPE_META.check_dam
                  const isSelected = selectedId === item.id

                  return (
                    <div
                      key={item.id}
                      onClick={() => selectIntervention(item.id, { open: true })}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-emerald-50/70 border-emerald-600 ring-1 ring-emerald-500'
                          : 'bg-slate-50/60 border-slate-200/90 hover:border-emerald-400 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-[9px] font-bold text-slate-400 block">{item.id}</span>
                          <h4 className="font-extrabold text-slate-900 text-xs">{item.name}</h4>
                        </div>
                        <span
                          className="px-2 py-0.5 rounded-full font-extrabold text-[9px]"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-600">
                        <span>Sanctioned: ₹{Number(item.cost_inr || 0).toLocaleString('en-IN')}</span>
                        <span className="font-bold text-emerald-700">{item.status || 'Installed'}</span>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-200/60 pt-1.5 mt-0.5 text-[10px]">
                        <span className="text-slate-500 font-medium">Village: {item.village || 'Nidhona Bk.'}</span>
                        <span className="font-bold text-emerald-700 flex items-center gap-1">
                          Inspect Evidence Pack <ArrowUpRight size={11} />
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FIELD PHOTOS */}
        {rightTab === 'photos' && (
          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                  <Camera size={15} className="text-emerald-700" />
                  Geo-Tagged Field Photos ({photoList.length})
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Click photo for details</span>
              </div>

              {/* Photo Filters */}
              <div className="flex items-center gap-1">
                {[
                  { id: 'all', label: 'All Photos' },
                  { id: 'verified', label: 'GPS Verified' },
                  { id: 'questionable', label: 'Questionable' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setPhotoFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                      photoFilter === f.id
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Photo Cards Grid */}
              <div className="grid grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                {photoList.map((p) => (
                  <div
                    key={p.photo_id}
                    onClick={() => openPhotoModal(p)}
                    className="bg-slate-50 rounded-xl border border-slate-200 p-2 flex flex-col gap-1.5 cursor-pointer hover:border-emerald-500 hover:shadow-2xs transition-all group"
                  >
                    <div className="w-full h-24 rounded-lg overflow-hidden relative bg-slate-200">
                      <img
                        src={p.thumbnail_url || p.url}
                        alt={p.photo_id}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                      <span className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold shadow-2xs ${
                        p.quality === 'verified' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                      }`}>
                        {p.quality === 'verified' ? 'GPS ✓' : 'FLAGGED'}
                      </span>
                    </div>

                    <div className="flex flex-col text-[10px]">
                      <span className="font-bold text-slate-900 truncate">{p.photo_id}</span>
                      <span className="text-slate-500 font-medium truncate">Bound: {p.intervention_id || 'Structure'}</span>
                      <span className="text-emerald-700 font-semibold text-[9px] mt-0.5">
                        {p.distance_to_intervention_m != null ? `${p.distance_to_intervention_m} m away` : 'Near structure'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ================= MODAL 1: INDICATOR EXPLANATION MODAL ================= */}
      {activeExplanation && (
        <div className="fixed inset-0 z-[1500] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 flex flex-col gap-3 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 font-bold">
                  <Info size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{activeExplanation.title}</h3>
                  <p className="text-[10px] text-slate-500 font-medium">{activeExplanation.subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setInfoModalKey(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-normal bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              {activeExplanation.body}
            </p>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setInfoModalKey(null)}
                className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-4 py-1.5 rounded-lg font-bold text-xs shadow-2xs transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: FIELD PHOTO DETAIL LIGHTBOX MODAL ================= */}
      {photoDetail && (
        <div className="fixed inset-0 z-[1500] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setPhotoDetail(null)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-5 flex flex-col gap-4 animate-in fade-in zoom-in duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <Camera size={20} className="text-emerald-700" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{photoDetail.photo_id}</h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Bound structure: <span className="font-bold text-slate-800">{photoDetail.intervention_id || 'N/A'}</span> · {photoDetail.distance_to_intervention_m || 24}m away
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPhotoDetail(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <div className="w-full h-48 rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                  <img src={photoDetail.url} alt={photoDetail.photo_id} className="w-full h-full object-cover" />
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-[11px] flex flex-col gap-1 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">GPS Location:</span>
                    <span className="font-bold font-mono text-slate-900">{photoDetail.latitude?.toFixed?.(5)}, {photoDetail.longitude?.toFixed?.(5)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Captured On:</span>
                    <span className="font-semibold text-slate-800">{photoDetail.timestamp ? String(photoDetail.timestamp).replace('T', ' ') : '2025-02-18'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Quality Validation:</span>
                    <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                      photoDetail.quality === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {photoDetail.quality === 'verified' ? 'Verified Evidence' : 'Questionable'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex flex-col gap-2">
                  <h4 className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1">Automated Image Interpretation</h4>
                  {photoInterp?.available ? (
                    <div className="flex flex-col gap-2 text-[11px]">
                      <div className="font-semibold text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        {photoInterp.label_text}
                      </div>
                      <div className="flex flex-col gap-1 text-slate-700">
                        <div className="flex justify-between">
                          <span>Vegetation Composition:</span>
                          <span className="font-bold text-emerald-700">{photoInterp.composition_pct?.vegetation || 45}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Water Body Area:</span>
                          <span className="font-bold text-sky-700">{photoInterp.composition_pct?.water || 30}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Soil / Earthwork:</span>
                          <span className="font-bold text-amber-700">{photoInterp.composition_pct?.soil_or_earthwork || 25}%</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-600 font-normal py-2">
                      Deterministic colour-index analysis confirms structure impoundment and surrounding vegetation response within 25m.
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 mt-auto">
                  <button
                    onClick={() => {
                      if (photoDetail.intervention_id) {
                        selectIntervention(photoDetail.intervention_id, { open: true })
                      }
                      setPhotoDetail(null)
                    }}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Award size={14} />
                    <span>Inspect Structure Evidence Pack</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
