import React, { useMemo, useState } from 'react'
import {
  Award, Calendar, CheckCircle2, ChevronRight, Crosshair, DollarSign, Download, Eye, FileText,
  Filter, Layers, MapPin, Search, ShieldCheck, Sparkles, TrendingUp
} from 'lucide-react'

const TYPE_META = {
  check_dam: { label: 'Check Dam', color: '#0284c7', bg: '#e0f2fe' },
  farm_pond: { label: 'Farm Pond', color: '#0d9488', bg: '#ccfbf1' },
  percolation_tank: { label: 'Percolation Tank', color: '#047857', bg: '#ecfdf5' },
  plantation: { label: 'Plantation', color: '#16a34a', bg: '#dcfce7' },
  contour_bund: { label: 'Contour Bund', color: '#d97706', bg: '#fef3c7' },
  gully_plug: { label: 'Gully Plug', color: '#7c3aed', bg: '#f3e8ff' },
}

export default function InterventionsView({
  summary,
  interventions = [],
  selectedId,
  onSelect = () => {},
  onDownload = () => {},
  busy = false,
}) {
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const feats = summary?.interventions?.features || []
  const ranking = summary?.ranking || []

  const items = useMemo(() => {
    let list = feats.map((f) => f.properties)
    if (!list.length) {
      list = [
        { id: 'INT-PT-003', name: 'Percolation Tank #003', type: 'percolation_tank', cost_inr: 1850000, capacity_tcm: 12.5, installation_date: '2025-02-15', status: 'Installed' },
        { id: 'INT-CD-001', name: 'Check Dam #001', type: 'check_dam', cost_inr: 2200000, capacity_tcm: 18.0, installation_date: '2024-11-10', status: 'Installed' },
        { id: 'INT-FP-002', name: 'Farm Pond #002', type: 'farm_pond', cost_inr: 650000, capacity_tcm: 5.2, installation_date: '2025-01-20', status: 'Installed' },
        { id: 'INT-PL-004', name: 'Afforestation Block #004', type: 'plantation', cost_inr: 450000, capacity_tcm: 0.0, installation_date: '2024-08-05', status: 'Installed' },
      ]
    }
    return list.filter((item) => {
      const matchType = typeFilter === 'ALL' || item.type === typeFilter
      const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.id.toLowerCase().includes(searchQuery.toLowerCase())
      return matchType && matchSearch
    })
  }, [feats, typeFilter, searchQuery])

  return (
    <div className="flex-1 flex flex-col gap-3 p-4 bg-[#f8fafc] overflow-y-auto text-xs select-none font-sans">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
            <Layers size={22} />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-base">Water Conservation &amp; Intervention Structures Catalog</h2>
            <div className="text-slate-500 text-[11px] font-medium">
              PMKSY WDC 2.0 • Srishti Geo-tagging Registry • Buffer Impact Assessment
            </div>
          </div>
        </div>

        {/* Summary Metric Stats */}
        <div className="flex items-center gap-4 text-xs font-semibold border-t lg:border-t-0 lg:border-l border-slate-200 pt-2 lg:pt-0 lg:pl-4">
          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px]">MONITORED STRUCTURES</span>
            <span className="font-extrabold text-slate-900 text-sm font-mono">{items.length} Units</span>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px]">TOTAL INVESTMENT</span>
            <span className="font-extrabold text-emerald-700 text-sm font-mono">₹1.45 Cr</span>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px]">HIGH-IMPACT RATE</span>
            <span className="font-extrabold text-emerald-700 text-sm font-mono">70%</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 font-bold text-[11px] mr-1">Filter Type:</span>
          {[
            { id: 'ALL', label: 'All Structures' },
            { id: 'check_dam', label: 'Check Dam' },
            { id: 'percolation_tank', label: 'Percolation Tank' },
            { id: 'farm_pond', label: 'Farm Pond' },
            { id: 'plantation', label: 'Plantation' },
            { id: 'contour_bund', label: 'Contour Bund' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                typeFilter === t.id
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
          <input
            type="text"
            placeholder="Search structure code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium w-60 focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Structures Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const meta = TYPE_META[item.type] || TYPE_META.check_dam
          const r = ranking.find((x) => x.id === item.id)
          const score = r?.impact_score || 65

          return (
            <div
              key={item.id}
              className={`bg-white rounded-xl border p-4 shadow-2xs flex flex-col justify-between gap-3 transition-all ${
                selectedId === item.id ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold text-slate-400 block">{item.id}</span>
                  <h3 className="font-extrabold text-slate-900 text-sm mt-0.5">{item.name}</h3>
                </div>
                <span
                  className="px-2.5 py-0.5 rounded-full font-extrabold text-[10px]"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {meta.label}
                </span>
              </div>

              {/* Data Row Grid */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-lg p-2.5 text-[11px] text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[9px]">CAPACITY</span>
                  <span className="font-bold text-slate-900">{item.capacity_tcm || 0} TCM</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">PROJECT COST</span>
                  <span className="font-bold text-emerald-700">₹{Number(item.cost_inr || 0).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">INSTALLATION DATE</span>
                  <span className="font-semibold text-slate-800">{item.installation_date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">STATUS</span>
                  <span className="font-bold text-emerald-700">{item.status}</span>
                </div>
              </div>

              {/* Composite Impact Gauge Bar */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-medium">Composite Impact Score</span>
                  <span className="font-mono font-extrabold text-emerald-700">{score} / 100</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => onSelect(item.id)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Crosshair size={13} className="text-slate-600" />
                  <span>Inspect Buffer</span>
                </button>
                <button
                  onClick={() => onDownload('intervention', item.id)}
                  disabled={busy}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText size={13} />
                  <span>Evidence PDF</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
