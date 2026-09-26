import React, { useState } from 'react'
import {
  ArrowUpRight, Award, CheckCircle2, ChevronRight, Droplets, ExternalLink, FileText,
  Filter, Leaf, Target, TrendingUp
} from 'lucide-react'

export default function OfficerRightPanel({
  summary,
  analysis,
  onSelect = () => {},
  onReport = () => {},
  busy = false,
}) {
  const [activeTab, setActiveTab] = useState('indicators')

  const stats = summary?.stats || {}
  const ranking = summary?.ranking || []
  const a = analysis?.analysis
  const item = analysis?.intervention || {
    id: 'INT-PT-003',
    name: 'Percolation Tank #003',
    type: 'Percolation Tank',
    installation_date: '2025-02-15',
    status: 'Installed',
  }

  return (
    <div className="w-[380px] shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-4 overflow-y-auto text-xs select-none">
      {/* ------------------- TOP TABS ------------------- */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-xs font-semibold">
        {[
          { id: 'indicators', label: 'Key Indicators' },
          { id: 'interventions', label: 'Interventions' },
          { id: 'structures', label: 'Structures (10)' },
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

      {/* ------------------- 2x2 KEY INDICATORS GRID ------------------- */}
      <div className="grid grid-cols-2 gap-3">
        {/* NDVI Mean */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px] uppercase tracking-wide">
            <Leaf size={14} className="text-emerald-600" />
            <span>NDVI MEAN</span>
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
        <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-sky-700 font-bold text-[11px] uppercase tracking-wide">
            <Droplets size={14} className="text-sky-600" />
            <span>SURFACE WATER</span>
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
        <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px] uppercase tracking-wide">
            <Target size={14} className="text-emerald-600" />
            <span>VEGETATED AREA</span>
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
        <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[11px] uppercase tracking-wide">
            <Award size={14} className="text-amber-600" />
            <span>STRUCTURES</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-extrabold text-slate-900 font-mono">
              {stats.interventions || 10}
            </span>
          </div>
          <div className="text-[10px] text-slate-600 font-medium mt-1">
            2 high-impact • 3 to verify
          </div>
        </div>
      </div>

      {/* ------------------- SELECTED STRUCTURE CARD ------------------- */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
            <Award size={14} className="text-emerald-600" />
            Selected Structure
          </span>
          <button className="text-emerald-700 hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer">
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
          <div className="w-28 h-20 rounded-lg overflow-hidden border border-slate-300 shadow-xs shrink-0">
            <img
              src="/percolation_tank.jpg"
              alt="Percolation Tank Structure"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Impact on Indicators (Pre vs Post) Table */}
        <div className="border-t border-slate-100 pt-2.5 flex flex-col gap-2">
          <span className="font-bold text-slate-800 text-[11px]">Impact on Indicators (Pre vs Post)</span>
          <div className="bg-slate-50 rounded-lg border border-slate-200/80 p-2 flex flex-col gap-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">NDVI (land only)</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-700">0.225 → 0.297</span>
                <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                  <TrendingUp size={11} /> +0.072
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Surface water</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-700">0.00 ha → 9.52 ha</span>
                <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                  <TrendingUp size={11} /> +9.52 ha
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Vegetated area</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-700">0.69 ha → 8.43 ha</span>
                <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                  <TrendingUp size={11} /> +7.73 ha
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/60 pt-1">
              <span className="text-slate-600 font-medium">Buffer improved</span>
              <span className="font-bold text-slate-900">27.5% of 19.67 ha</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
