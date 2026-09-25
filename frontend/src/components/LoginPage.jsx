import React, { useState } from 'react'
import {
  ArrowRight,
  ChevronRight,
  Compass,
  Eye,
  EyeOff,
  Layers,
  Lock,
  Mail,
  MapPin,
  Shield,
  ShieldCheck,
  Users,
  Waves,
} from 'lucide-react'

const DEMO_ACCOUNTS = [
  {
    name: 'Dr. Rajesh Kumar Sharma',
    email: 'district.officer@dolr.gov.in',
    role: 'DISTRICT_OFFICER',
    roleTitle: 'District Collector / Nodal Officer',
    portal: '/app/officer',
    badge: 'Officer Portal',
  },
  {
    name: 'Priya Deshmukh',
    email: 'watershed.officer@dolr.gov.in',
    role: 'WATERSHED_OFFICER',
    roleTitle: 'WDT Monitoring Lead',
    portal: '/app/officer',
    badge: 'WDT Lead',
  },
  {
    name: 'Amit V. Patil',
    email: 'field.inspector@dolr.gov.in',
    role: 'FIELD_OFFICER',
    roleTitle: 'DRISHTI Field Inspector',
    portal: '/app/verification',
    badge: 'Field Inspector',
  },
  {
    name: 'CA Suresh K. Mehta',
    email: 'auditor@dolr.gov.in',
    role: 'AUDITOR',
    roleTitle: 'Third-Party Compliance Auditor',
    portal: '/app/audit',
    badge: 'Auditor',
  },
  {
    name: 'Super Admin Nodal',
    email: 'admin@dolr.gov.in',
    role: 'ADMIN',
    roleTitle: 'National System Administrator',
    portal: '/app/admin',
    badge: 'Super Admin',
  },
]

export default function LoginPage({ onLoginSuccess, onBackToHome }) {
  const [roleType, setRoleType] = useState('officer') // 'officer' | 'user'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showDemoPicker, setShowDemoPicker] = useState(false)

  const handleLoginSubmit = (e) => {
    e.preventDefault()
    if (!email) {
      setError('Please enter your official email ID.')
      return
    }
    setLoading(true)
    setError(null)

    setTimeout(() => {
      const match = DEMO_ACCOUNTS.find(
        (a) => a.email.toLowerCase() === email.toLowerCase()
      )
      const userRole = match ? match.role : 'DISTRICT_OFFICER'
      let targetPortal = '/app/officer'
      if (userRole === 'ADMIN') targetPortal = '/app/admin'
      else if (userRole === 'FIELD_OFFICER') targetPortal = '/app/verification'
      else if (userRole === 'AUDITOR') targetPortal = '/app/audit'

      const userObj = {
        name: match
          ? match.name
          : email.split('@')[0].replace('.', ' ').toUpperCase(),
        email: email,
        role: userRole,
        roleTitle: match
          ? match.roleTitle
          : userRole.replace('_', ' ').toUpperCase(),
        department: 'Department of Land Resources',
        district: 'Pune',
        state: 'Maharashtra',
      }
      setLoading(false)
      onLoginSuccess(userObj, targetPortal)
    }, 400)
  }

  const handleDemoSignIn = (acc) => {
    setEmail(acc.email)
    setPassword('Govt@2026#DoLR')
    setLoading(true)
    setTimeout(() => {
      const userObj = {
        name: acc.name,
        email: acc.email,
        role: acc.role,
        roleTitle: acc.roleTitle,
        department: 'Department of Land Resources',
        district: 'Pune',
        state: 'Maharashtra',
      }
      setLoading(false)
      onLoginSuccess(userObj, acc.portal)
    }, 300)
  }

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* 1. TOP NAVBAR HEADER (EXACT MATCH) */}
      <header className="w-full bg-white border-b border-slate-200/80 px-6 lg:px-10 py-3.5 flex items-center justify-between z-30 sticky top-0">
        {/* Brand Logo & Title */}
        <div
          onClick={onBackToHome}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-full bg-[#059669] flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-all">
            <Compass size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-black text-slate-900 tracking-tight font-mono">
                WATERSHED INSIGHT
              </h1>
              <span className="text-[11px] font-semibold bg-[#e6f4ea] text-[#047857] border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                DoLR • Govt. of India
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Geospatial Evidence Platform
            </p>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
          <button
            onClick={onBackToHome}
            className="text-slate-900 font-bold hover:text-[#059669] transition-colors cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={onBackToHome}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            3D Geospatial
          </button>
          <button
            onClick={onBackToHome}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Capabilities
          </button>
          <button
            onClick={onBackToHome}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Multi-Temporal
          </button>
          <button
            onClick={onBackToHome}
            className="hover:text-slate-900 transition-colors cursor-pointer"
          >
            Auditability
          </button>
        </nav>

        {/* Right Action Button */}
        <button
          onClick={onBackToHome}
          className="flex items-center gap-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-semibold px-4 py-2 rounded-full shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
        >
          <Compass size={14} className="text-[#059669] stroke-[2.5]" />
          <span>Explore Map</span>
        </button>
      </header>

      {/* 2. MAIN PAGE BODY SPLIT (LEFT HERO + RIGHT FLOATING CARD) */}
      <main className="flex-1 w-full flex flex-col lg:flex-row relative">
        {/* LEFT HERO SECTION (DARK TERRAIN IMAGE + 3D STACK) */}
        <div className="lg:w-[62%] relative min-h-[640px] lg:min-h-[calc(100vh-64px)] p-8 lg:p-14 flex flex-col justify-between overflow-hidden">
          {/* Background Aerial Terrain Image & Gradient Overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src="/watershed_hero_bg.jpg"
              alt="Watershed Aerial Imagery"
              className="w-full h-full object-cover object-center filter brightness-95 contrast-110"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#05111f]/95 via-[#071628]/85 to-[#091b30]/65" />
          </div>

          {/* Top Hero Headlines */}
          <div className="relative z-10 space-y-3.5 max-w-2xl">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.12] tracking-tight">
              GEOSPATIAL INTELLIGENCE. <br />
              <span className="text-[#10b981]">POWERED BY PIXELS & PROOF.</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-200/90 font-normal leading-relaxed max-w-xl">
              Integrating 30m Sentinel multispectral satellite observation,
              geo-coded DRISHTI field evidence, and elevation hydrology into an
              auditable decision-support system.
            </p>
          </div>

          {/* Center 3D Layer Stack Graphic Overlay (Identical to Image) */}
          <div className="relative z-10 my-6 py-6 px-4 sm:px-8 rounded-2xl bg-slate-900/35 border border-white/10 backdrop-blur-md max-w-2xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* Stack Labels on Left */}
              <div className="space-y-4 w-full sm:w-auto">
                {/* 1. Satellite Observation */}
                <div className="flex items-center gap-3 bg-[#0a1828]/95 border border-teal-500/40 px-4 py-2.5 rounded-xl text-white text-xs font-medium backdrop-blur-md shadow-lg">
                  <div className="w-6 h-6 rounded bg-teal-500/20 text-teal-300 flex items-center justify-center">
                    <Compass size={14} />
                  </div>
                  <div className="leading-tight">
                    <div className="font-semibold text-white">Satellite</div>
                    <div className="text-[10px] text-slate-300">Observation</div>
                  </div>
                </div>

                {/* 2. DRISHTI Field Evidence */}
                <div className="flex items-center gap-3 bg-[#0a1828]/95 border border-emerald-500/40 px-4 py-2.5 rounded-xl text-white text-xs font-medium backdrop-blur-md shadow-lg">
                  <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                    <MapPin size={14} />
                  </div>
                  <div className="leading-tight">
                    <div className="font-semibold text-white">DRISHTI Field</div>
                    <div className="text-[10px] text-slate-300">Evidence</div>
                  </div>
                </div>

                {/* 3. Elevation Hydrology */}
                <div className="flex items-center gap-3 bg-[#0a1828]/95 border border-blue-500/40 px-4 py-2.5 rounded-xl text-white text-xs font-medium backdrop-blur-md shadow-lg">
                  <div className="w-6 h-6 rounded bg-blue-500/20 text-blue-300 flex items-center justify-center">
                    <Waves size={14} />
                  </div>
                  <div className="leading-tight">
                    <div className="font-semibold text-white">Elevation</div>
                    <div className="text-[10px] text-slate-300">Hydrology</div>
                  </div>
                </div>
              </div>

              {/* 3D Isometric Diamond Stack Graphic */}
              <div className="relative w-56 h-44 flex items-center justify-center">
                {/* Top Layer: Green/Orange NDVI Map */}
                <div className="absolute top-0 left-6 w-40 h-22 rounded-xl bg-gradient-to-tr from-emerald-600/90 via-amber-500/70 to-teal-400/80 border border-emerald-300/80 transform -rotate-12 skew-x-12 shadow-2xl backdrop-blur-xs flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white tracking-wider font-mono drop-shadow">
                    SENTINEL L2A
                  </span>
                </div>

                {/* Middle Layer: Monochrome Photo EXIF Layer */}
                <div className="absolute top-10 left-3 w-40 h-22 rounded-xl bg-gradient-to-tr from-slate-900/90 via-slate-600/80 to-slate-400/60 border border-slate-300/60 transform -rotate-12 skew-x-12 shadow-2xl backdrop-blur-xs flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white tracking-wider font-mono drop-shadow">
                    EXIF PROOF
                  </span>
                </div>

                {/* Bottom Layer: Blue Elevation Flow Layer */}
                <div className="absolute top-20 left-0 w-40 h-22 rounded-xl bg-gradient-to-tr from-blue-700/90 via-cyan-500/70 to-blue-300/60 border border-cyan-300/80 transform -rotate-12 skew-x-12 shadow-2xl backdrop-blur-xs flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white tracking-wider font-mono drop-shadow">
                    DEM FLOW
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom 4 Feature Cards */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col justify-between space-y-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Compass size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  30m Sentinel-2
                </div>
                <div className="text-[11px] text-slate-300/80 font-normal">
                  Multispectral Stacks
                </div>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col justify-between space-y-3">
              <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <MapPin size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">DRISHTI EXIF</div>
                <div className="text-[11px] text-slate-300/80 font-normal">
                  Geo-tagged Field Photos
                </div>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col justify-between space-y-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Layers size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">250m Buffer</div>
                <div className="text-[11px] text-slate-300/80 font-normal">
                  Hydrological Zonal Stats
                </div>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col justify-between space-y-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  100% Auditable
                </div>
                <div className="text-[11px] text-slate-300/80 font-normal">
                  Signed ReportLab PDF
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT FLOATING CARD AREA (EXACT MATCH TO RIGHT SIDE OF IMAGE) */}
        <div className="lg:w-[38%] bg-[#f3f5f8] p-6 lg:p-12 flex items-center justify-center relative">
          <div className="w-full max-w-md bg-white rounded-3xl p-7 lg:p-8 shadow-xl border border-slate-200/80 space-y-6">
            {/* Card Header Title */}
            <div className="text-center space-y-1">
              <p className="text-xs font-medium text-slate-500">Welcome to</p>
              <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-mono">
                WATERSHED INSIGHT
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Geospatial Evidence Platform
              </p>
            </div>

            {/* Role Segmented Pill Toggle */}
            <div className="bg-[#f1f5f9] p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200/60">
              <button
                type="button"
                onClick={() => setRoleType('officer')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  roleType === 'officer'
                    ? 'bg-[#059669] text-white shadow-md shadow-emerald-700/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield size={14} />
                <span>Officer Login</span>
              </button>

              <button
                type="button"
                onClick={() => setRoleType('user')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  roleType === 'user'
                    ? 'bg-[#059669] text-white shadow-md shadow-emerald-700/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users size={14} />
                <span>User Login</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-medium">
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Email ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your official email ID"
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Checkbox & Forgot Password Link */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#059669] focus:ring-[#059669] accent-[#059669] cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() =>
                    alert('Password reset link sent to official email.')
                  }
                  className="font-bold text-[#059669] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#059669] hover:bg-[#047857] text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>{loading ? 'Authenticating...' : 'Login'}</span>
                <ArrowRight size={16} />
              </button>
            </form>

            {/* Separator */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[11px]">
                <span className="bg-white px-3 text-slate-400 font-medium">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Government SSO Button */}
            <button
              type="button"
              onClick={() => handleDemoSignIn(DEMO_ACCOUNTS[0])}
              className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-between cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm">🏛️</span>
                <span>Login with Government SSO</span>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>

            {/* Quick Demo Role Picker Drawer */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowDemoPicker(!showDemoPicker)}
                className="w-full text-center text-[11px] font-bold text-[#059669] hover:underline cursor-pointer"
              >
                {showDemoPicker
                  ? '▲ Hide Demo Accounts'
                  : '▼ Select Demo Officer Role (1-Click Sign In)'}
              </button>

              {showDemoPicker && (
                <div className="mt-2.5 space-y-1 bg-slate-50 border border-slate-200 rounded-xl p-2 max-h-44 overflow-y-auto">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleDemoSignIn(acc)}
                      className="w-full text-left bg-white hover:bg-emerald-50/80 border border-slate-200 p-2 rounded-lg transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800 group-hover:text-[#059669]">
                          {acc.name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {acc.roleTitle}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-[#e6f4ea] text-[#047857] px-2 py-0.5 rounded">
                        {acc.badge}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Security Banner Footer Box */}
            <div className="bg-[#e6f4ea] border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#059669] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <ShieldCheck size={14} />
              </div>
              <div className="text-[11px] text-slate-900 font-medium leading-snug">
                <span className="font-bold block text-slate-900">
                  Secure access for authorized government officers only.
                </span>
                <span className="text-slate-600 text-[10px]">
                  Part of Department of Land Resources, Govt. of India.
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
