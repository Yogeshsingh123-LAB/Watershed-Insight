import React, { useState } from 'react'
import {
  ArrowUpRight, BarChart3, Calendar, CheckCircle2, ChevronRight, Compass,
  Download, Droplets, Eye, FileText, Filter, Globe, Info, Layers, Leaf, MapPin,
  Maximize2, RefreshCw, Search, ShieldCheck, Sparkles, Target, TrendingUp, UserCheck, X
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import Navbar from './Navbar'
import MapView from './MapView'
import WatershedExplorerView from './WatershedExplorerView'
import InterventionsView from './InterventionsView'
import ChangePanel from './ChangePanel'
import ResourcesView from './ResourcesView'
import SupportView from './SupportView'

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

export default function PublicPortal({
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
  health,
  busy,
  downloadReport,
  onOpenLogin,
}) {
  const [navTab, setNavTab] = useState('explorer')
  const [infoModalKey, setInfoModalKey] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const current = summary?.watershed || {}
  const stats = summary?.stats || {}

  const activeExplanation = infoModalKey ? INDICATOR_EXPLANATIONS[infoModalKey] : null

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8fafc] overflow-hidden select-none font-sans">
      {/* 3-Tier Official Government Header with Public Access Badge & Officer Login Button */}
      <Navbar
        catalog={catalog}
        watershedId={watershedId}
        onSelectWatershed={onSelectWatershed}
        health={health}
        busy={busy}
        onGenerateReport={() => downloadReport('watershed', watershedId)}
        currentUser={null}
        onOpenLogin={onOpenLogin}
        onLogout={() => {}}
        activeNavTab={navTab}
        onSelectNavTab={setNavTab}
        isPublic={true}
      />

      {/* Main Dynamic Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden p-3">
        {/* PUBLIC EXPLORER VIEW */}
        {navTab === 'explorer' && (
          <WatershedExplorerView
            catalog={catalog}
            watershedId={watershedId}
            onSelectWatershed={onSelectWatershed}
            summary={summary}
            overlays={overlays}
            layers={layers}
            setLayers={setLayers}
            basemap={basemap}
            setBasemap={setBasemap}
            interventions={interventions}
            photos={photos}
            selectedId={selectedId}
            selectIntervention={selectIntervention}
            focus={focus}
            radius={radius}
            opacity={opacity}
            catchment={catchment}
            hotspots={hotspots}
            loading={loading}
            downloadReport={downloadReport}
            busy={busy}
          />
        )}

        {/* PUBLIC INTERVENTIONS VIEW */}
        {navTab === 'interventions' && (
          <InterventionsView
            summary={summary}
            interventions={interventions}
            selectedId={selectedId}
            onSelect={(id) => selectIntervention(id, { open: true })}
            onDownload={downloadReport}
            busy={busy}
          />
        )}

        {/* PUBLIC CHANGE ANALYSIS VIEW */}
        {navTab === 'change' && (
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-2xs p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <TrendingUp size={20} className="text-emerald-700" />
                  Citizen Change Analysis &amp; Spatial Impact
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Compare baseline pre-implementation satellite observations with post-implementation watershed outcomes.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-bold px-3 py-1 rounded-full">
                  🟢 Public Read-Only Access
                </span>
              </div>
            </div>

            <ChangePanel
              summary={summary}
              watershedId={watershedId}
              epochKey={null}
              setEpochKey={() => {}}
              epochs={summary?.epochs || []}
            />
          </div>
        )}

        {/* PUBLIC RESOURCES VIEW */}
        {navTab === 'resources' && <ResourcesView />}

        {/* PUBLIC HELP & SUPPORT VIEW */}
        {navTab === 'support' && <SupportView />}

        {/* PUBLIC HOME VIEW */}
        {navTab === 'home' && (
          <div className="flex-1 flex flex-col xl:flex-row gap-3 min-w-0 h-full overflow-y-auto pr-1">
            {/* Center Map & Main Content Column */}
            <div className="flex-1 flex flex-col gap-3 min-w-0 h-full">
              {/* Top Banner Alert */}
              <div className="bg-gradient-to-r from-slate-900 via-[#1e293b] to-emerald-950 text-white p-3.5 rounded-xl border border-slate-800 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shrink-0 font-bold">
                    <Eye size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-xs tracking-tight">Public Watershed Explorer</span>
                      <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-mono px-2 py-0.5 rounded-full border border-emerald-400/30 uppercase font-bold">
                        PUBLIC ACCESS
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                      Explore satellite observations, water harvesting structures, and vegetation indices across India’s micro-watersheds.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadReport('watershed', watershedId)}
                    disabled={busy}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download Public Summary</span>
                  </button>
                  <button
                    onClick={onOpenLogin}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <UserCheck size={13} className="text-emerald-400" />
                    <span>Officer Login</span>
                  </button>
                </div>
              </div>

              {/* Central Satellite Map */}
              <div className="flex-1 min-w-0 h-[450px] rounded-xl overflow-hidden border border-slate-200 shadow-xs relative">
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

              {/* Public Watershed Observations Summary */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <h3 className="font-extrabold text-slate-900 text-xs mb-2 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-emerald-700" />
                  Public Watershed Observations &amp; Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-700">
                  <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1 shrink-0" />
                    <span>Vegetation canopy coverage has expanded across downstream agricultural fields between baseline and recent satellite acquisitions.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                    <span className="w-2 h-2 rounded-full bg-sky-600 mt-1 shrink-0" />
                    <span>Surface water impoundment area shows measurable post-monsoon expansion behind constructed percolation tanks and check dams.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                    <span className="w-2 h-2 rounded-full bg-amber-600 mt-1 shrink-0" />
                    <span>10 water conservation structures are currently registered under PMKSY-WDC 2.0 for geo-spatial satellite monitoring.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 mt-1 shrink-0" />
                    <span>Satellite observations (Sentinel-2, LISS-IV) provide objective, continuous evidence of micro-watershed treatment progress.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Information & Public Indicators Panel */}
            <aside className="w-full xl:w-[380px] shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">
              {/* Watershed Information Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <MapPin size={15} className="text-emerald-700" />
                    Watershed Information
                  </span>
                  <span className="text-emerald-800 bg-emerald-50 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-emerald-200">
                    PUBLIC DATA
                  </span>
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
                </div>
              </div>

              {/* Public Key Indicators Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <BarChart3 size={15} className="text-emerald-700" />
                    Public Key Indicators
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Click ⓘ for info</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* NDVI Mean */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-emerald-700 font-bold text-[10px] uppercase">
                      <div className="flex items-center gap-1">
                        <Leaf size={12} className="text-emerald-600" />
                        <span>NDVI MEAN</span>
                      </div>
                      <button
                        onClick={() => setInfoModalKey('ndvi')}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                        title="Explain NDVI indicator"
                      >
                        <Info size={13} />
                      </button>
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
                    <div className="text-[9px] text-slate-500 font-medium mt-0.5">Vegetation health index</div>
                  </div>

                  {/* Surface Water */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-sky-700 font-bold text-[10px] uppercase">
                      <div className="flex items-center gap-1">
                        <Droplets size={12} className="text-sky-600" />
                        <span>SURFACE WATER</span>
                      </div>
                      <button
                        onClick={() => setInfoModalKey('water')}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                        title="Explain Surface Water indicator"
                      >
                        <Info size={13} />
                      </button>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-lg font-extrabold text-slate-900 font-mono">
                        {stats.water_area_ha_t1 ? `${stats.water_area_ha_t1.toFixed(1)} ha` : '12.8 ha'}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-500 font-medium mt-0.5">Open water area</div>
                  </div>

                  {/* Vegetated Area */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-emerald-800 font-bold text-[10px] uppercase">
                      <div className="flex items-center gap-1">
                        <Target size={12} className="text-emerald-600" />
                        <span>VEGETATED AREA</span>
                      </div>
                      <button
                        onClick={() => setInfoModalKey('veg')}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                        title="Explain Vegetated Area indicator"
                      >
                        <Info size={13} />
                      </button>
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

                  {/* Interventions */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-amber-800 font-bold text-[10px] uppercase">
                      <div className="flex items-center gap-1">
                        <ShieldCheck size={12} className="text-amber-600" />
                        <span>INTERVENTIONS</span>
                      </div>
                      <button
                        onClick={() => setInfoModalKey('interventions')}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                        title="Explain Interventions indicator"
                      >
                        <Info size={13} />
                      </button>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-lg font-extrabold text-slate-900 font-mono">
                        {stats.interventions || 10}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-600 font-medium mt-0.5">
                      Water harvesting units
                    </div>
                  </div>
                </div>
              </div>

              {/* Rainfall Trend Chart */}
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
        )}
      </div>

      {/* Indicator Explanation Modal */}
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
    </div>
  )
}
