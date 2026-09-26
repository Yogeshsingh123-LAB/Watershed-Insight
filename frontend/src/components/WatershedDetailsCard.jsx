import React, { useState } from 'react'
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react'

export default function WatershedDetailsCard({ summary }) {
  const [collapsed, setCollapsed] = useState(false)
  const meta = summary?.watershed || {}

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div
        className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <MapPin size={14} />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Watershed Details</h3>
        </div>
        <button className="text-slate-400 hover:text-slate-600 transition-colors">
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div className="p-4 flex flex-col gap-2.5 text-xs">
          <div className="grid grid-cols-2 gap-y-2 text-slate-700">
            <div className="text-slate-500 font-medium">Watershed ID</div>
            <div className="font-bold text-slate-900 font-mono">{meta.code || 'MWS-MH-2025-014'}</div>

            <div className="text-slate-500 font-medium">Name</div>
            <div className="font-bold text-slate-900">{meta.name || 'Aurangabad North Micro-Watershed'}</div>

            <div className="text-slate-500 font-medium">State</div>
            <div className="font-semibold text-slate-800">Maharashtra</div>

            <div className="text-slate-500 font-medium">District</div>
            <div className="font-semibold text-slate-800">Chhatrapati Sambhajinagar</div>

            <div className="text-slate-500 font-medium">Block</div>
            <div className="font-semibold text-slate-800">Paithan</div>

            <div className="text-slate-500 font-medium">Village</div>
            <div className="font-semibold text-slate-800">{meta.village || 'Nidhona Bk.'}</div>

            <div className="text-slate-500 font-medium">Geographical Area</div>
            <div className="font-bold text-slate-900">{meta.area_ha ? `${meta.area_ha} ha` : '457.12 ha'}</div>

            <div className="text-slate-500 font-medium">Rainfall (Normal)</div>
            <div className="font-semibold text-slate-800">{meta.rainfall_mm ? `${meta.rainfall_mm} mm` : '712 mm'}</div>

            <div className="text-slate-500 font-medium">Soil Type</div>
            <div className="font-medium text-slate-800">{meta.soil || 'Medium black (Vertic Inceptisol)'}</div>

            <div className="text-slate-500 font-medium">Aquifer</div>
            <div className="font-medium text-slate-800 leading-tight">{meta.aquifer || 'Deccan basalt - weathered / fractured'}</div>
          </div>
        </div>
      )}
    </div>
  )
}
