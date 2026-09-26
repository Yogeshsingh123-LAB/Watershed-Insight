import React, { useState } from 'react'
import {
  BarChart3, Calendar, CheckCircle2, ChevronRight, Download, Eye, FileText, Filter,
  Layers, LineChart, PieChart as PieIcon, ShieldCheck, Sparkles, TrendingUp
} from 'lucide-react'
import BeforeAfterPanel from './BeforeAfterPanel'
import ChangePanel from './ChangePanel'
import ReportsPanel from './ReportsPanel'
import DecisionCenterPanel from './DecisionCenterPanel'

export default function AnalyticsReportsView({
  watershedId,
  summary,
  interventions,
  selectedId,
  radius,
  onDownload,
  busy,
}) {
  const [subTab, setSubTab] = useState('change')

  return (
    <div className="flex-1 flex flex-col gap-3 p-4 bg-[#f8fafc] overflow-y-auto text-xs select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200">
            <BarChart3 size={22} />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-base">Analytics &amp; Evidence Reports Suite</h2>
            <div className="text-slate-500 text-[11px] font-medium">
              Geospatial Evidence • Change Detection • Executive Dossier Export • PMKSY-WDC Audit
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onDownload('watershed', watershedId)}
            disabled={busy}
            className="bg-[#047857] hover:bg-[#065f46] text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Download size={14} />
            <span>Generate Executive Dossier (PDF)</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 rounded-xl text-xs font-semibold shadow-2xs">
        {[
          { id: 'change', label: 'Change Analysis & Temporal Comparison', icon: TrendingUp },
          { id: 'decision', label: 'AI Decision Center & Priority Matrix', icon: Sparkles },
          { id: 'reports', label: 'PDF Dossiers & Evidence Export', icon: FileText },
        ].map((t) => {
          const Icon = t.icon
          const isActive = subTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`px-3.5 py-2 rounded-lg flex items-center gap-2 font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon size={15} className={isActive ? 'text-emerald-700' : 'text-slate-400'} />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Dynamic Content Body */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-2xs p-4 overflow-y-auto">
        {subTab === 'change' && (
          <div className="flex flex-col gap-6">
            <BeforeAfterPanel watershedId={watershedId} interventions={interventions} />
            <ChangePanel
              summary={summary}
              watershedId={watershedId}
              epochs={summary?.epochs || []}
            />
          </div>
        )}

        {subTab === 'decision' && (
          <DecisionCenterPanel
            watershedId={watershedId}
            onSelectIntervention={() => {}}
            onOpenAi={() => {}}
          />
        )}

        {subTab === 'reports' && (
          <ReportsPanel
            watershedId={watershedId}
            summary={summary}
            selectedId={selectedId}
            radius={radius}
            onDownload={onDownload}
            busy={busy}
          />
        )}
      </div>
    </div>
  )
}
