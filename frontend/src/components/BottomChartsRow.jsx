import React from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { BarChart3, PieChart as PieIcon } from 'lucide-react'

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

const LULC_DATA = [
  { name: 'Agriculture', value: 62.3, color: '#10b981' },
  { name: 'Vegetation', value: 21.8, color: '#34d399' },
  { name: 'Built-up', value: 8.1, color: '#f59e0b' },
  { name: 'Water Bodies', value: 2.8, color: '#0ea5e9' },
  { name: 'Others', value: 5.0, color: '#94a3b8' },
]

export default function BottomChartsRow() {
  return (
    <div className="grid grid-cols-2 gap-4 w-full h-[220px]">
      {/* CARD 1: RAINFALL TREND (MM) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-sky-100 text-sky-700 flex items-center justify-center">
              <BarChart3 size={13} />
            </div>
            <h4 className="font-bold text-slate-800 text-xs">Rainfall Trend (mm)</h4>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-semibold">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-sky-500"></span> Actual Rainfall
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-200"></span> Normal Rainfall
            </span>
          </div>
        </div>

        <div className="w-full h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={RAINFALL_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} domain={[0, 300]} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11 }}
              />
              <Bar dataKey="actual" fill="#0284c7" radius={[3, 3, 0, 0]} name="Actual Rainfall (mm)" />
              <Bar dataKey="normal" fill="#e2e8f0" radius={[3, 3, 0, 0]} name="Normal Rainfall (mm)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CARD 2: LAND USE / LAND COVER (2024) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <PieIcon size={13} />
            </div>
            <h4 className="font-bold text-slate-800 text-xs">Land Use / Land Cover (2024)</h4>
          </div>
        </div>

        <div className="flex items-center justify-between h-36">
          {/* Doughnut Chart with Center Area Text */}
          <div className="relative w-36 h-36 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={LULC_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={55}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {LULC_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f172a', borderRadius: 8, color: '#fff', fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="font-extrabold text-slate-900 text-[11px] leading-none font-mono">457.12 ha</span>
              <span className="text-[9px] text-slate-500 font-medium">Total Area</span>
            </div>
          </div>

          {/* Legend Table */}
          <div className="flex flex-col gap-1.5 flex-1 pl-4 text-xs">
            {LULC_DATA.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                  <span className="text-slate-700 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 font-mono">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
