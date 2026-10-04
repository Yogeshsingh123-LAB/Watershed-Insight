import React, { useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowUpRight, Award, BarChart3, CheckCircle2, ChevronRight, Droplets, ExternalLink,
  FileText, Filter, Info, Leaf, Search, ShieldCheck, Target, TrendingUp, X
} from 'lucide-react'

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

export default function OfficerRightPanel({
  summary,
  analysis,
  onSelect = () => {},
  onReport = () => {},
  busy = false,
}) {
  const [activeTab, setActiveTab] = useState('indicators')
  const [infoModalKey, setInfoModalKey] = useState(null)
  const [filterType, setFilterType] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const stats = summary?.stats || {}
  const feats = summary?.interventions?.features || []
  const ranking = summary?.ranking || []
  const a = analysis?.analysis
  const item = analysis?.intervention || {
    id: 'INT-PT-003',
    name: 'Percolation Tank #003',
    type: 'percolation_tank',
    installation_date: '2025-02-15',
    status: 'Installed',
  }

  const monitoredList = useMemo(() => {
    let list = feats.map((f) => f.properties)
    if (!list.length) {
      list = [
        { id: 'INT-PT-003', name: 'Percolation Tank #003', type: 'percolation_tank', cost_inr: 1850000, capacity_tcm: 12.5, installation_date: '2025-02-15', status: 'Installed', village: 'Nidhona Bk.' },
        { id: 'INT-CD-001', name: 'Check Dam #001', type: 'check_dam', cost_inr: 2200000, capacity_tcm: 18.0, installation_date: '2024-11-10', status: 'Installed', village: 'Nidhona Bk.' },
        { id: 'INT-FP-002', name: 'Farm Pond #002', type: 'farm_pond', cost_inr: 650000, capacity_tcm: 5.2, installation_date: '2025-01-20', status: 'Installed', village: 'Nidhona Bk.' },
        { id: 'INT-PL-004', name: 'Afforestation Block #004', type: 'plantation', cost_inr: 450000, capacity_tcm: 0.0, installation_date: '2024-08-05', status: 'Installed', village: 'Nidhona Bk.' },
      ]
    }
    return list.filter((i) => {
      const matchType = filterType === 'ALL' || i.type === filterType
      const matchSearch = !searchQuery || (i.name && i.name.toLowerCase().includes(searchQuery.toLowerCase())) || (i.id && i.id.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchType && matchSearch
    })
  }, [feats, filterType, searchQuery])

  const activeExplanation = infoModalKey ? INDICATOR_EXPLANATIONS[infoModalKey] : null

  return (
    <div className="w-[380px] shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-4 overflow-y-auto text-xs select-none relative">
      {/* ------------------- TOP TABS ------------------- */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-xs font-semibold">
        {[
          { id: 'indicators', label: 'Key Indicators' },
          { id: 'structures', label: `Structures (${monitoredList.length})` },
          { id: 'change', label: 'Change Analysis' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-1.5 transition-all cursor-pointer font-bold ${
              activeTab === tab.id
                ? 'text-emerald-700 border-b-2 border-emerald-600 font-extrabold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ------------------- TAB 1: KEY INDICATORS ------------------- */}
      {activeTab === 'indicators' && (
        <>
          {/* 2x2 KEY INDICATORS GRID */}
          <div className="grid grid-cols-2 gap-3">
            {/* NDVI Mean */}
            <div
              className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 flex flex-col justify-between cursor-pointer hover:border-emerald-400 transition-colors"
              onClick={() => setInfoModalKey('ndvi')}
            >
              <div className="flex items-center justify-between text-emerald-700 font-bold text-[11px] uppercase tracking-wide">
                <div className="flex items-center gap-1.5">
                  <Leaf size={14} className="text-emerald-600" />
                  <span>NDVI MEAN</span>
                </div>
                <Info size={13} className="text-slate-400 hover:text-slate-700" />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-extrabold text-slate-900 font-mono">
                  {stats.ndvi_mean_t1?.toFixed(3) || '0.296'}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-0.5">
                  <TrendingUp size={11} />
                  +{stats.ndvi_change?.toFixed(3) || '0.046'}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-medium">vs 2024-05-28</div>
            </div>

            {/* Surface Water */}
            <div
              className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 flex flex-col justify-between cursor-pointer hover:border-sky-400 transition-colors"
              onClick={() => setInfoModalKey('water')}
            >
              <div className="flex items-center justify-between text-sky-700 font-bold text-[11px] uppercase tracking-wide">
                <div className="flex items-center gap-1.5">
                  <Droplets size={14} className="text-sky-600" />
                  <span>SURFACE WATER</span>
                </div>
                <Info size={13} className="text-slate-400 hover:text-slate-700" />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-extrabold text-slate-900 font-mono">
                  {stats.water_area_ha_t1 ? `${stats.water_area_ha_t1.toFixed(1)} ha` : '12.8 ha'}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-0.5">
                  <TrendingUp size={11} />
                  +{stats.water_area_change_ha ? `${stats.water_area_change_ha.toFixed(2)} ha` : '12.77 ha'}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-medium">vs baseline</div>
            </div>

            {/* Vegetated Area */}
            <div
              className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 flex flex-col justify-between cursor-pointer hover:border-emerald-400 transition-colors"
              onClick={() => setInfoModalKey('veg')}
            >
              <div className="flex items-center justify-between text-emerald-800 font-bold text-[11px] uppercase tracking-wide">
                <div className="flex items-center gap-1.5">
                  <Target size={14} className="text-emerald-600" />
                  <span>VEGETATED AREA</span>
                </div>
                <Info size={13} className="text-slate-400 hover:text-slate-700" />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-extrabold text-slate-900 font-mono">
                  {stats.veg_area_ha_t1 ? `${stats.veg_area_ha_t1.toFixed(0)} ha` : '272 ha'}
                </span>
              </div>
              <div className="text-[10px] text-emerald-700 font-bold mt-1">
                +{stats.veg_area_change_ha ? stats.veg_area_change_ha.toFixed(1) : '203.6'} ha (NDVI &gt; 0.30)
              </div>
            </div>

            {/* Structures */}
            <div
              className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 flex flex-col justify-between cursor-pointer hover:border-amber-400 transition-colors"
              onClick={() => setInfoModalKey('interventions')}
            >
              <div className="flex items-center justify-between text-amber-800 font-bold text-[11px] uppercase tracking-wide">
                <div className="flex items-center gap-1.5">
                  <Award size={14} className="text-amber-600" />
                  <span>STRUCTURES</span>
                </div>
                <Info size={13} className="text-slate-400 hover:text-slate-700" />
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-extrabold text-slate-900 font-mono">
                  {stats.interventions || monitoredList.length || 10}
                </span>
              </div>
              <div className="text-[10px] text-slate-600 font-medium mt-1">
                Water harvesting units
              </div>
            </div>
          </div>

          {/* SELECTED STRUCTURE CARD */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Award size={14} className="text-emerald-600" />
                Selected Structure
              </span>
              <button
                onClick={() => setActiveTab('structures')}
                className="text-emerald-700 hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                View All Structures <ArrowUpRight size={12} />
              </button>
            </div>

            {/* Structure Header & Tag */}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">{item.name || 'Percolation Tank #003'}</h4>
              </div>
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                High Response
              </span>
            </div>

            {/* Details List + Structure Photo Thumbnail */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1.5 text-[11px] flex-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Structure Code</span>
                  <span className="font-bold text-slate-800 font-mono">{item.id || 'INT-PT-003'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Type</span>
                  <span className="font-semibold text-slate-800">{item.type || 'Percolation Tank'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Installation Date</span>
                  <span className="font-semibold text-slate-800">{item.installation_date || '2025-02-15'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Status</span>
                  <span className="font-bold text-emerald-700">{item.status || 'Installed'}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-slate-500 font-medium">Composite Impact Score</span>
                  <span className="font-extrabold text-emerald-700 text-sm font-mono">
                    {a?.impact_score?.toFixed(0) || '65'} / 100
                  </span>
                </div>
              </div>

              {/* Percolation Tank Photo Thumbnail */}
              <div
                className="w-28 h-20 rounded-lg overflow-hidden border border-slate-300 shadow-xs shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => onSelect(item.id)}
                title="Inspect evidence modal"
              >
                <img
                  src="/percolation_tank.jpg"
                  alt="Percolation Tank Structure"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Inspect Evidence Button */}
            <button
              onClick={() => onSelect(item.id)}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs mt-1"
            >
              <Award size={14} />
              <span>Inspect Full Evidence Pack</span>
            </button>
          </div>
        </>
      )}

      {/* ------------------- TAB 2: STRUCTURES LIST ------------------- */}
      {activeTab === 'structures' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Search structure code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                  onClick={() => setFilterType(t.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                    filterType === t.id
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
            {monitoredList.map((i) => {
              const meta = TYPE_META[i.type] || TYPE_META.check_dam
              return (
                <div
                  key={i.id}
                  onClick={() => onSelect(i.id)}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-emerald-500 transition-all cursor-pointer flex flex-col gap-1.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[9px] font-bold text-slate-400 block">{i.id}</span>
                      <h4 className="font-extrabold text-slate-900 text-xs">{i.name}</h4>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full font-extrabold text-[9px]"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-600">
                    <span>Cost: ₹{Number(i.cost_inr || 0).toLocaleString('en-IN')}</span>
                    <span className="font-bold text-emerald-700">{i.status || 'Installed'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ------------------- TAB 3: CHANGE ANALYSIS ------------------- */}
      {activeTab === 'change' && (
        <div className="flex flex-col gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2">
            <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
              <TrendingUp size={14} className="text-emerald-700" />
              Land Use / Land Cover Transition
            </h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Comparison between Sentinel-2 baseline acquisition (2024-05-28) and latest post-monsoon evaluation (2025-02-28).
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2 text-[11px]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 font-semibold text-slate-700">
              <span>Land Category</span>
              <span>Net Expansion (ha)</span>
            </div>
            <div className="flex justify-between items-center text-emerald-800 font-bold">
              <span>Single Crop Land</span>
              <span className="font-mono">+185.4 ha</span>
            </div>
            <div className="flex justify-between items-center text-sky-800 font-bold">
              <span>Surface Water Bodies</span>
              <span className="font-mono">+12.77 ha</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 font-medium">
              <span>Barren / Scrub Land</span>
              <span className="font-mono text-rose-700">-198.1 ha</span>
            </div>
          </div>
        </div>
      )}

      {/* INDICATOR EXPLANATION MODAL */}
      {activeExplanation && (
        <div className="fixed inset-0 z-[1500] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setInfoModalKey(null)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 flex flex-col gap-3 animate-in fade-in zoom-in duration-150" onClick={(e) => e.stopPropagation()}>
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
