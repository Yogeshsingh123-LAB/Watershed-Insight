import React, { useState } from 'react'
import {
  ArrowUpRight, BarChart3, Calendar, ChevronDown, Compass, Droplets, Eye, FileText,
  Filter, Globe, Layers, Leaf, MapPin, Maximize2, RefreshCw, Search, ShieldCheck, Target, TrendingUp
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import MapView from './MapView'

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

  return (
    <div className="flex-1 flex gap-3 p-3 overflow-hidden bg-[#f8fafc] text-xs select-none">
      {/* ================= COLUMN 1: LEFT SIDEBAR (Select Location & Quick Layers) ================= */}
      <aside className="w-[260px] shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">
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
      <div className="flex-1 flex flex-col gap-2 min-w-0 h-full overflow-hidden">
        {/* SUB-TABS DIRECTLY ABOVE MAP */}
        <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-2 py-1 rounded-t-xl text-xs font-semibold">
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

        {/* GEOSPATIAL MAP VIEWPORT */}
        <div className="flex-1 w-full h-full rounded-b-xl overflow-hidden relative border border-slate-200 shadow-xs">
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
            onSelect={selectIntervention}
            focus={focus}
            radius={radius}
            opacity={opacity}
            catchment={catchment}
            hotspots={hotspots}
            loading={loading}
          />
        </div>
      </div>

      {/* ================= COLUMN 3: RIGHT SIDE PANEL (Information + Indicators + Rainfall) ================= */}
      <aside className="w-[380px] shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">
        {/* TOP TAB BAR */}
        <div className="bg-white rounded-xl border border-slate-200 p-2 flex items-center justify-between font-bold text-xs shadow-2xs">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'indicators', label: 'Key Indicators' },
            { id: 'interventions', label: 'Interventions (10)' },
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

        {/* SECTION 1: WATERSHED INFORMATION CARD */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <MapPin size={15} className="text-emerald-700" />
              Watershed Information
            </span>
            <button className="text-emerald-700 hover:underline font-bold text-[11px] flex items-center gap-0.5 cursor-pointer">
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

        {/* SECTION 2: KEY INDICATORS (2025 VS 2024) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <BarChart3 size={15} className="text-emerald-700" />
              Key Indicators (2025 vs 2024)
            </span>
            <button className="text-emerald-700 hover:underline font-bold text-[11px] flex items-center gap-0.5 cursor-pointer">
              View Analytics <ArrowUpRight size={12} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* NDVI Mean */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[10px] uppercase">
                <Leaf size={13} className="text-emerald-600" />
                <span>NDVI MEAN</span>
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
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-sky-700 font-bold text-[10px] uppercase">
                <Droplets size={13} className="text-sky-600" />
                <span>SURFACE WATER</span>
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
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[10px] uppercase">
                <Target size={13} className="text-emerald-600" />
                <span>VEGETATED AREA</span>
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
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[10px] uppercase">
                <ShieldCheck size={13} className="text-amber-600" />
                <span>STRUCTURES</span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-extrabold text-slate-900 font-mono">
                  {stats.interventions || 10}
                </span>
              </div>
              <div className="text-[9px] text-slate-600 font-medium mt-0.5">
                2 high-impact • 3 to verify
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: RAINFALL TREND (MM) */}
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
      </aside>
    </div>
  )
}
