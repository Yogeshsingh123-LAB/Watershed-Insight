import React, { useEffect, useMemo, useState, useRef } from 'react'
import {
  Bell, Calendar, ChevronDown, Compass, Download, Eye, FileText, Globe, Layers, LayoutDashboard,
  LogOut, Map, MapPin, Maximize2, Share2, ShieldCheck, UserCheck,
  CheckCheck, X, AlertCircle, CheckCircle2, AlertTriangle, Info, ExternalLink, Trash2
} from 'lucide-react'


/**
 * Navbar Component - 3-Tier Government Header Bar:
 * Tier 1: DoLR & Govt of India Branding Header
 * Tier 2: Dark Navy Navigation Bar (#0f172a)
 * Tier 3: Sub-Header Location Cascade Toolbar & Breadcrumbs
 */
export default function Navbar({
  catalog,
  watershedId,
  onSelectWatershed,
  health,
  busy,
  onGenerateReport,
  currentUser,
  onOpenLogin,
  onLogout,
  activeNavTab = 'explorer',
  onSelectNavTab = () => {},
  isPublic = false,
}) {
  const hierarchy = catalog?.hierarchy || []
  const watersheds = catalog?.watersheds || {}

  // Locate the currently selected watershed inside the hierarchy.
  const current = useMemo(() => {
    for (const st of hierarchy) {
      for (const di of st.districts) {
        for (const bl of di.blocks) {
          const ws = bl.watersheds.find((w) => w.id === watershedId)
          if (ws) return { st, di, bl, ws }
        }
      }
    }
    const st = hierarchy[0]
    const di = st?.districts?.[0]
    const bl = di?.blocks?.[0]
    return st && di && bl ? { st, di, bl, ws: bl.watersheds[0] } : null
  }, [hierarchy, watershedId])

  const [stateCode, setStateCode] = useState(current?.st?.code || '')
  const [districtCode, setDistrictCode] = useState(current?.di?.code || '')
  const [blockCode, setBlockCode] = useState(current?.bl?.code || '')

  useEffect(() => {
    if (!current) return
    setStateCode(current.st.code)
    setDistrictCode(current.di.code)
    setBlockCode(current.bl.code)
  }, [current?.st?.code, current?.di?.code, current?.bl?.code])

  // Notifications State & Handlers
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifFilter, setNotifFilter] = useState('all') // 'all' | 'unread' | 'alerts'
  const notifRef = useRef(null)

  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      title: 'EXIF Location Mismatch',
      message: 'DRISHTI Photo #PH-2025-089 (Nallasopara Check Dam) GPS coordinates are 420m outside buffer zone boundary.',
      time: '12 mins ago',
      type: 'warning',
      unread: true,
      linkTab: 'interventions'
    },
    {
      id: 'notif-2',
      title: 'NDVI Change Detection Ready',
      message: 'Multi-epoch satellite change detection computed for Paithan Block (MWS-MH-2025-014). Net vegetation index increased +14.2%.',
      time: '1 hour ago',
      type: 'success',
      unread: true,
      linkTab: 'analytics'
    },
    {
      id: 'notif-3',
      title: 'Field Verification Pending',
      message: 'Inspection report #INSP-2025-04 submitted by WDT Field Lead for Check Dam CD-04 requires nodal sign-off.',
      time: '3 hours ago',
      type: 'urgent',
      unread: false,
      linkTab: 'explorer'
    },
    {
      id: 'notif-4',
      title: 'Dossier PDF Generated',
      message: 'Micro-Watershed Executive Summary Dossier generated for MWS-MH-2025-014 and ready for download.',
      time: 'Yesterday',
      type: 'info',
      unread: false,
      linkTab: 'downloads'
    }
  ])

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = useMemo(() => notifications.filter((n) => n.unread).length, [notifications])

  const filteredNotifications = useMemo(() => {
    if (notifFilter === 'unread') return notifications.filter((n) => n.unread)
    if (notifFilter === 'alerts') return notifications.filter((n) => n.type === 'warning' || n.type === 'urgent')
    return notifications
  }, [notifications, notifFilter])

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
  }

  const toggleRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n))
    )
  }

  const dismissNotif = (id, e) => {
    e.stopPropagation()
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }


  const state = hierarchy.find((s) => s.code === stateCode) || hierarchy[0]
  const districts = state?.districts || []
  const district = districts.find((d) => d.code === districtCode) || districts[0]
  const blocks = district?.blocks || []
  const block = blocks.find((b) => b.code === blockCode) || blocks[0]
  const wsOptions = block?.watersheds || []

  const pickFirstWatershed = (list) => {
    if (list?.length) onSelectWatershed(list[0].id)
  }

  const selectedWsName = current?.ws?.code || watershedId || 'MWS-MH-2025-014'

  const PAGE_TITLES = {
    home: 'Overview & Dashboard',
    explorer: 'Watershed Explorer',
    interventions: 'Interventions Catalog',
    analytics: 'Analytics & Evidence Reports',
    downloads: 'Data & Downloads Center',
    resources: 'Technical Guidelines & Resources',
    support: 'Helpdesk & Support',
  }

  return (
    <header className="w-full flex flex-col shadow-xs z-[1200] bg-white border-b border-slate-200">
      {/* ----------------- TIER 1: OFFICIAL GOVERNMENT TOP BRANDING BAR ----------------- */}
      <div className="h-[60px] bg-white px-5 flex items-center justify-between border-b border-slate-200/80">
        {/* Left Branding Group */}
        <div className="flex items-center gap-4">
          {/* Emblem of India Graphic */}
          <div className="flex items-center gap-2.5">
            <svg width="30" height="38" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 text-slate-800">
              <path d="M50 10C55 10 60 15 60 20C60 25 55 30 50 30C45 30 40 25 40 20C40 15 45 10 50 10Z" fill="#1e293b"/>
              <path d="M30 40H70V50H30V40Z" fill="#1e293b"/>
              <path d="M20 55C20 50 30 48 50 48C70 48 80 50 80 55V85H20V55Z" fill="#334155"/>
              <circle cx="50" cy="70" r="12" stroke="#059669" strokeWidth="4" fill="none"/>
              <path d="M15 90H85V102H15V90Z" fill="#0f172a"/>
              <text x="50" y="114" fontSize="11" fontWeight="bold" textAnchor="middle" fill="#0f172a">सत्यमेव जयते</text>
            </svg>
            <div className="flex flex-col leading-tight border-r border-slate-200 pr-4">
              <span className="text-[10px] font-bold tracking-wider text-slate-700 uppercase">GOVERNMENT OF INDIA</span>
              <span className="text-[12px] font-semibold text-slate-900">Ministry of Rural Development</span>
              <span className="text-[10px] text-slate-500 font-medium">Department of Land Resources</span>
            </div>
          </div>

          {/* Platform Brand Title */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white p-0.5 shadow-sm border border-slate-200/80 flex items-center justify-center shrink-0">
              <img src="/dharascan_logo.png" alt="DharaScan Logo" className="h-full w-full object-contain rounded-lg" />
            </div>
            <div className="flex flex-col">
              <div className="text-[13px] font-extrabold text-slate-900 tracking-tight leading-tight">
                National Geospatial Watershed Monitoring &amp; Evidence Platform
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[12px] font-black text-emerald-700 tracking-wider font-mono uppercase">
                  DharaScan
                </span>
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                  SRISHTI/DRISHTI Mirror: SYNCED
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Officer Profile / Public Access & Accessibility Tools */}
        <div className="flex items-center gap-4">
          {/* Utility accessibility links */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-600 font-medium border-r border-slate-200 pr-4">
            <span className="hover:text-slate-900 cursor-pointer">Skip to main content</span>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1 font-semibold text-slate-700">
              <span className="hover:text-emerald-700 cursor-pointer text-[10px]">A-</span>
              <span className="hover:text-emerald-700 cursor-pointer text-[11px]">A</span>
              <span className="hover:text-emerald-700 cursor-pointer text-[12px]">A+</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1 cursor-pointer hover:text-emerald-700">
              <Globe size={13} className="text-slate-500" />
              <span>English</span>
              <ChevronDown size={11} className="text-slate-400" />
            </div>
          </div>

          {isPublic ? (
            <div className="flex items-center gap-3">
              {/* Public Badge */}
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                <Eye size={13} className="text-emerald-600" />
                <span>PUBLIC ACCESS</span>
              </div>

              {/* Officer Login Button */}
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 bg-[#0f172a] hover:bg-[#1e293b] text-white px-3.5 py-1.5 rounded-lg text-xs font-extrabold shadow-xs transition-all cursor-pointer"
              >
                <UserCheck size={14} className="text-emerald-400" />
                <span>Officer Login</span>
              </button>
            </div>
          ) : (
            <>
              {/* User Profile Badge */}
              {(() => {
                const displayName = currentUser?.name || 'Dr. Rajesh Kumar Sharma'
                const displayTitle = currentUser?.roleTitle || currentUser?.department || 'District Collector / Nodal Officer'
                const initials = displayName.split(' ').filter(Boolean).map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'RK'
                return (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-700 border border-emerald-600 flex items-center justify-center font-bold text-white text-xs shadow-xs">
                      {initials}
                    </div>
                    <div className="flex flex-col text-left leading-tight">
                      <span className="text-xs font-bold text-slate-900">{displayName}</span>
                      <span className="text-[10px] text-slate-500 font-medium">{displayTitle}</span>
                    </div>
                  </div>
                )
              })()}

              {/* Notifications Dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative p-2 rounded-full transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    showNotifications
                      ? 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/40'
                      : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                  title="Notifications & Alerts"
                  aria-label="Notifications"
                  aria-expanded={showNotifications}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown Menu */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2.5 w-80 sm:w-[380px] bg-white rounded-xl shadow-2xl border border-slate-200/90 z-[1300] overflow-hidden flex flex-col text-slate-800 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Header */}
                    <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Bell size={16} className="text-emerald-400" />
                        <span className="font-bold text-xs tracking-wide">System Notifications</span>
                        {unreadCount > 0 && (
                          <span className="bg-rose-500/90 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            {unreadCount} New
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <CheckCheck size={13} />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                      <button
                        onClick={() => setNotifFilter('all')}
                        className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                          notifFilter === 'all'
                            ? 'bg-white text-emerald-700 shadow-2xs font-bold border border-slate-200'
                            : 'hover:bg-slate-200/60 text-slate-600'
                        }`}
                      >
                        All ({notifications.length})
                      </button>
                      <button
                        onClick={() => setNotifFilter('unread')}
                        className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                          notifFilter === 'unread'
                            ? 'bg-white text-emerald-700 shadow-2xs font-bold border border-slate-200'
                            : 'hover:bg-slate-200/60 text-slate-600'
                        }`}
                      >
                        Unread ({unreadCount})
                      </button>
                      <button
                        onClick={() => setNotifFilter('alerts')}
                        className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                          notifFilter === 'alerts'
                            ? 'bg-white text-emerald-700 shadow-2xs font-bold border border-slate-200'
                            : 'hover:bg-slate-200/60 text-slate-600'
                        }`}
                      >
                        Alerts ({notifications.filter(n => n.type === 'warning' || n.type === 'urgent').length})
                      </button>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
                      {filteredNotifications.length === 0 ? (
                        <div className="py-8 px-4 text-center text-slate-400 text-xs">
                          <Bell size={24} className="mx-auto mb-2 text-slate-300 stroke-1" />
                          <p className="font-medium text-slate-500">No notifications found</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">You're all caught up with your monitoring queue.</p>
                        </div>
                      ) : (
                        filteredNotifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              toggleRead(notif.id)
                              if (notif.linkTab) onSelectNavTab(notif.linkTab)
                            }}
                            className={`p-3 transition-colors cursor-pointer flex items-start gap-3 relative group ${
                              notif.unread
                                ? 'bg-emerald-50/40 hover:bg-emerald-50/80 border-l-3 border-emerald-500'
                                : 'bg-white hover:bg-slate-50'
                            }`}
                          >
                            {/* Type Icon */}
                            <div className="mt-0.5 shrink-0">
                              {notif.type === 'warning' && (
                                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                                  <AlertTriangle size={14} />
                                </div>
                              )}
                              {notif.type === 'urgent' && (
                                <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                                  <AlertCircle size={14} />
                                </div>
                              )}
                              {notif.type === 'success' && (
                                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                  <CheckCircle2 size={14} />
                                </div>
                              )}
                              {notif.type === 'info' && (
                                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                  <Info size={14} />
                                </div>
                              )}
                            </div>

                            {/* Text Content */}
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <h4 className={`text-xs truncate ${notif.unread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                                  {notif.title}
                                </h4>
                                <span className="text-[10px] text-slate-400 shrink-0">{notif.time}</span>
                              </div>
                              <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                                {notif.message}
                              </p>
                              {notif.linkTab && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 mt-1 hover:underline">
                                  <span>View in {PAGE_TITLES[notif.linkTab] || notif.linkTab}</span>
                                  <ExternalLink size={10} />
                                </span>
                              )}
                            </div>

                            {/* Dismiss button */}
                            <button
                              onClick={(e) => dismissNotif(notif.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-all shrink-0 cursor-pointer"
                              title="Dismiss"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] font-medium text-slate-500">
                      <span className="text-slate-500">
                        {notifications.length} total alert{notifications.length !== 1 ? 's' : ''}
                      </span>
                      {notifications.length > 0 && (
                        <button
                          onClick={() => setNotifications([])}
                          className="text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} />
                          <span>Clear All</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>


              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 bg-[#047857] hover:bg-[#065f46] text-white px-3.5 py-1.5 rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>Logout</span>
                <LogOut size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ----------------- TIER 2: DARK NAVY MAIN NAVIGATION BAR ----------------- */}
      <nav className="h-[44px] bg-[#0f172a] text-white px-4 flex items-center justify-between text-xs font-semibold select-none">
        <div className="flex items-center gap-1">
          {(isPublic
            ? [
                { id: 'home', label: 'Home', icon: '🏠' },
                { id: 'explorer', label: 'Watershed Explorer', icon: '🌐' },
                { id: 'interventions', label: 'Interventions', icon: '⚙️' },
                { id: 'change', label: 'Change Analysis', icon: '📈' },
                { id: 'resources', label: 'Resources', icon: '📁' },
                { id: 'support', label: 'Help & Support', icon: '❓' },
              ]
            : [
                { id: 'home', label: 'Home', icon: '🏠' },
                { id: 'explorer', label: 'Watershed Explorer', icon: '🌐' },
                { id: 'interventions', label: 'Interventions', icon: '⚙️' },
                { id: 'analytics', label: 'Analytics & Reports', icon: '📊' },
                { id: 'downloads', label: 'Data & Downloads', icon: '📥' },
                { id: 'resources', label: 'Resources', icon: '📁' },
                { id: 'support', label: 'Help & Support', icon: '❓' },
              ]
          ).map((item) => {
            const isActive = activeNavTab === item.id || (activeNavTab === 'dashboard' && item.id === 'home')
            return (
              <button
                key={item.id}
                onClick={() => onSelectNavTab(item.id)}
                className={`px-3.5 py-2 rounded-sm flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1e293b] text-white font-bold border-b-2 border-emerald-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-mono text-emerald-400 font-bold">
            {isPublic ? 'PUBLIC WATERSHED EXPLORER' : 'LIVE SYSTEM ACTIVE'}
          </span>
        </div>
      </nav>

      {/* ----------------- TIER 3: CASCADING FILTER TOOLBAR & BREADCRUMBS ----------------- */}
      <div className="bg-[#f8fafc] border-b border-slate-200 px-5 py-2 flex flex-col gap-1.5">
        {/* Cascade dropdown row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* State */}
            <div className="flex items-center gap-1.5">
              <label className="text-slate-500 font-medium text-[11px]">State</label>
              <select
                className="bg-white border border-slate-300 rounded-md px-3 py-1 font-semibold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                value={state?.code || ''}
                onChange={(e) => {
                  setStateCode(e.target.value)
                  const s = hierarchy.find((x) => x.code === e.target.value)
                  setDistrictCode(s?.districts?.[0]?.code || '')
                  setBlockCode(s?.districts?.[0]?.blocks?.[0]?.code || '')
                  pickFirstWatershed(s?.districts?.[0]?.blocks?.[0]?.watersheds)
                }}
              >
                {hierarchy.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* District */}
            <div className="flex items-center gap-1.5">
              <label className="text-slate-500 font-medium text-[11px]">District</label>
              <select
                className="bg-white border border-slate-300 rounded-md px-3 py-1 font-semibold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                value={district?.code || ''}
                onChange={(e) => {
                  setDistrictCode(e.target.value)
                  const d = districts.find((x) => x.code === e.target.value)
                  setBlockCode(d?.blocks?.[0]?.code || '')
                  pickFirstWatershed(d?.blocks?.[0]?.watersheds)
                }}
              >
                {districts.map((d) => (
                  <option key={d.code} value={d.code}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Block */}
            <div className="flex items-center gap-1.5">
              <label className="text-slate-500 font-medium text-[11px]">Block</label>
              <select
                className="bg-white border border-slate-300 rounded-md px-3 py-1 font-semibold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                value={block?.code || ''}
                onChange={(e) => {
                  setBlockCode(e.target.value)
                  const b = blocks.find((x) => x.code === e.target.value)
                  pickFirstWatershed(b?.watersheds)
                }}
              >
                {blocks.map((b) => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Watershed / Micro-watershed */}
            <div className="flex items-center gap-1.5">
              <label className="text-slate-500 font-medium text-[11px]">Watershed / Micro-watershed</label>
              <select
                className="bg-white border border-emerald-600 text-emerald-800 font-bold rounded-md px-3 py-1 text-xs focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                value={watershedId || ''}
                onChange={(e) => onSelectWatershed(e.target.value)}
              >
                {wsOptions.map((w) => (
                  <option key={w.id} value={w.id}>{w.code}</option>
                ))}
              </select>
            </div>

            {/* Apply Button */}
            <button className="bg-[#047857] hover:bg-[#065f46] text-white px-3.5 py-1 rounded-md font-semibold text-xs transition-colors shadow-2xs flex items-center gap-1 cursor-pointer">
              <span>Apply</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 text-xs">
            {activeNavTab === 'explorer' && (
              <div className="bg-white border border-slate-300 text-slate-800 px-3 py-1 rounded-lg font-bold flex items-center gap-2 shadow-2xs">
                <Calendar size={13} className="text-slate-500" />
                <span>2024-05-28</span>
                <span className="text-slate-400 font-normal">vs</span>
                <span>2025-03-15</span>
              </div>
            )}
            <button className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1 rounded-md font-semibold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer">
              <Share2 size={13} className="text-slate-500" />
              <span>Share</span>
            </button>
            <button
              onClick={onGenerateReport}
              disabled={busy || !watershedId}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 px-3 py-1 rounded-md font-semibold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download size={13} className="text-slate-600" />
              <span>Export Dossier (PDF)</span>
            </button>
          </div>
        </div>

        {/* Sub-line: Breadcrumbs & Live Data Status */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="text-slate-400">🏠</span>
            <span className="text-slate-400">›</span>
            <span>{state?.name || 'Maharashtra'}</span>
            <span className="text-slate-400">›</span>
            <span>{district?.name || 'Chhatrapati Sambhajinagar'}</span>
            <span className="text-slate-400">›</span>
            <span>{block?.name || 'Paithan'}</span>
            <span className="text-slate-400">›</span>
            <span className="font-bold text-slate-900">{selectedWsName}</span>
            <span className="text-slate-400">›</span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {PAGE_TITLES[activeNavTab] || 'Overview'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span>Last Updated: <b className="text-slate-700 font-semibold">28 May 2025, 10:42 AM</b></span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Data
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
