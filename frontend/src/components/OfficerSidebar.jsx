import React from 'react'
import {
  BookOpen, BarChart3, FileText, Globe, HelpCircle, Info, Layers, LayoutDashboard,
  LifeBuoy, ShieldCheck, Users
} from 'lucide-react'

export default function OfficerSidebar({ activeTab = 'info', onSelectTab = () => {} }) {
  const menuItems = [
    { id: 'info', label: 'Watershed Information', icon: Info },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'explorer', label: 'Watershed Explorer', icon: Globe },
    { id: 'interventions', label: 'Interventions', icon: Layers },
    { id: 'change', label: 'Change Analysis', icon: BarChart3 },
    { id: 'reports', label: 'Reports & Downloads', icon: FileText },
    { id: 'users', label: 'User Management', icon: Users },
  ]

  const supportItems = [
    { id: 'guidelines', label: 'Guidelines', icon: BookOpen },
    { id: 'docs', label: 'Documentation', icon: FileText },
    { id: 'support', label: 'Contact Support', icon: HelpCircle },
  ]

  return (
    <aside className="w-[220px] shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex flex-col justify-between text-xs select-none">
      <div className="flex flex-col gap-1">
        {/* Main Navigation Items */}
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2.5 font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-emerald-700' : 'text-slate-400'} />
              <span>{item.label}</span>
            </button>
          )
        })}

        {/* Divider & Support Section */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            SUPPORT
          </div>
          {supportItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 font-medium transition-colors cursor-pointer ${
                  isActive ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon size={15} className="text-slate-400" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer Branding Badge */}
      <div className="mt-6 bg-slate-50 border border-slate-100 rounded-lg p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-700">
            DoLR
          </div>
          <div className="flex flex-col text-[10px] text-slate-600 leading-tight">
            <span className="font-bold text-slate-800">DoLR</span>
            <span className="text-slate-500">Ministry of Rural Development</span>
            <span className="text-slate-500">Government of India</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 border-t border-slate-200/60 pt-2 flex items-center justify-between">
          <span>Version 2.1.0</span>
          <span>Last updated: 26 May 2025</span>
        </div>
      </div>
    </aside>
  )
}
