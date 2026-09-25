import React, { useState } from 'react'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Compass,
  Eye,
  EyeOff,
  Layers,
  Lock,
  Mail,
  MapPin,
  Shield,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react'

const DEMO_ACCOUNTS = [
  {
    name: 'Dr. Rajesh Kumar Sharma',
    email: 'district.officer@dolr.gov.in',
    role: 'DISTRICT_OFFICER',
    roleTitle: 'District Collector / Nodal Officer',
    portal: '/app/officer',
    badge: 'Officer',
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
    badge: 'Inspector',
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
    badge: 'Admin',
  },
]

export default function LoginPage({ onLoginSuccess, onBackToHome }) {
  const [roleType, setRoleType] = useState('officer') // 'officer' | 'user'
  const [email, setEmail] = useState('district.officer@dolr.gov.in')
  const [password, setPassword] = useState('Govt@2026#DoLR')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showDemoPicker, setShowDemoPicker] = useState(false)

  const handleLoginSubmit = (e) => {
    e.preventDefault()
    if (!email) {
      setError('Please enter your email ID.')
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
    <div className="min-h-screen w-full bg-[#0a111e] text-slate-100 flex flex-col justify-between font-sans relative overflow-x-hidden selection:bg-emerald-500 selection:text-white">
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
        <img
          src="/watershed_hero_bg.jpg"
          alt="Watershed Aerial Imagery"
          className="w-full h-full object-cover object-center opacity-40 filter brightness-90 contrast-110"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060b14]/95 via-[#0a1220]/85 to-[#0b1426]/75" />
      </div>

      {/* TOP NAVBAR */}
      <header className="relative z-20 w-full px-6 py-4 flex items-center justify-between border-b border-white/10 backdrop-blur-md bg-[#080d19]/60">
        {/* Brand Logo */}
        <div
          onClick={onBackToHome}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10 group-hover:scale-105 transition-all">
            <Compass size={22} className="animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-white tracking-wider font-mono">
                WATERSHED INSIGHT
              </h1>
              <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                DoLR • Govt. of India
              </span>
            </div>
            <p className="text-[11px] text-slate-300/80 font-medium">
              Geospatial Evidence Platform
            </p>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-300">
          <button
            onClick={onBackToHome}
            className="hover:text-emerald-400 transition-colors cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={onBackToHome}
            className="hover:text-emerald-400 transition-colors cursor-pointer"
          >
            3D Geospatial
          </button>
          <button
            onClick={onBackToHome}
            className="hover:text-emerald-400 transition-colors cursor-pointer"
          >
            Capabilities
          </button>
          <button
            onClick={onBackToHome}
            className="hover:text-emerald-400 transition-colors cursor-pointer"
          >
            Multi-Temporal
          </button>
          <button
            onClick={onBackToHome}
            className="hover:text-emerald-400 transition-colors cursor-pointer"
          >
            Auditability
          </button>
        </nav>

        {/* Right Action Button */}
        <button
          onClick={onBackToHome}
          className="flex items-center gap-2 border border-white/20 hover:border-emerald-400/50 bg-white/5 hover:bg-emerald-500/10 text-white text-xs font-medium px-4 py-2 rounded-full transition-all cursor-pointer backdrop-blur-sm"
        >
          <Compass size={14} className="text-emerald-400" />
          <span>Explore Map</span>
        </button>
      </header>

      {/* MAIN CONTENT SPLIT AREA */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* LEFT COLUMN: HERO GEOSPATIAL INTELLIGENCE & 3D STACK */}
        <div className="lg:col-span-7 space-y-8 pr-0 lg:pr-4">
          {/* Main Titles */}
          <div className="space-y-3">
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight">
              GEOSPATIAL INTELLIGENCE. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
                POWERED BY PIXELS & PROOF.
              </span>
            </h2>
            <p className="text-sm md:text-base text-slate-300/90 max-w-2xl leading-relaxed font-normal">
              Integrating 30m Sentinel multispectral satellite observation,
              geo-coded DRISHTI field evidence, and elevation hydrology into an
              auditable decision-support system.
            </p>
          </div>

          {/* Floating 3D Geospatial Stack Diagram */}
          <div className="relative my-6 p-6 rounded-2xl bg-slate-900/40 border border-white/10 backdrop-blur-md overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* Stack Description Labels */}
              <div className="space-y-3 z-10">
                <div className="flex items-center gap-3 bg-emerald-950/60 border border-emerald-500/30 px-3.5 py-2 rounded-xl backdrop-blur-md">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Layers size={14} />
                  </div>
                  <span className="text-xs font-semibold text-emerald-200">
                    Satellite Observation
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-teal-950/60 border border-teal-500/30 px-3.5 py-2 rounded-xl backdrop-blur-md">
                  <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                    <MapPin size={14} />
                  </div>
                  <span className="text-xs font-semibold text-teal-200">
                    DRISHTI Field Evidence
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-blue-950/60 border border-blue-500/30 px-3.5 py-2 rounded-xl backdrop-blur-md">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Compass size={14} />
                  </div>
                  <span className="text-xs font-semibold text-blue-200">
                    Elevation Hydrology
                  </span>
                </div>
              </div>

              {/* Isometric Visual Stack Display */}
              <div className="relative w-52 h-44 flex items-center justify-center">
                {/* Layer 1: NDVI Overlay */}
                <div className="absolute top-2 left-6 w-36 h-20 rounded-lg bg-gradient-to-tr from-emerald-600/80 via-emerald-400/50 to-teal-300/40 border border-emerald-300/60 transform -rotate-12 skew-x-12 shadow-lg shadow-emerald-500/20 backdrop-blur-xs flex items-center justify-center">
                  <span className="text-[10px] font-mono font-bold text-white drop-shadow">
                    NDVI Stack
                  </span>
                </div>
                {/* Layer 2: DRISHTI Exif */}
                <div className="absolute top-10 left-3 w-36 h-20 rounded-lg bg-gradient-to-tr from-slate-700/80 via-slate-500/50 to-slate-300/30 border border-slate-300/50 transform -rotate-12 skew-x-12 shadow-lg backdrop-blur-xs flex items-center justify-center">
                  <span className="text-[10px] font-mono font-bold text-white drop-shadow">
                    EXIF Photos
                  </span>
                </div>
                {/* Layer 3: DEM Hydrology */}
                <div className="absolute top-18 left-0 w-36 h-20 rounded-lg bg-gradient-to-tr from-blue-700/80 via-cyan-500/50 to-blue-300/40 border border-blue-300/60 transform -rotate-12 skew-x-12 shadow-lg shadow-blue-500/20 backdrop-blur-xs flex items-center justify-center">
                  <span className="text-[10px] font-mono font-bold text-white drop-shadow">
                    DEM Stream Flow
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom 4 Feature Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3.5 backdrop-blur-md flex flex-col justify-between space-y-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <Compass size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  30m Sentinel-2
                </div>
                <div className="text-[11px] text-slate-400 font-normal">
                  Multispectral Stacks
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3.5 backdrop-blur-md flex flex-col justify-between space-y-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <MapPin size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">DRISHTI EXIF</div>
                <div className="text-[11px] text-slate-400 font-normal">
                  Geo-tagged Field Photos
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3.5 backdrop-blur-md flex flex-col justify-between space-y-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <Layers size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">250m Buffer</div>
                <div className="text-[11px] text-slate-400 font-normal">
                  Hydrological Zonal Stats
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3.5 backdrop-blur-md flex flex-col justify-between space-y-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  100% Auditable
                </div>
                <div className="text-[11px] text-slate-400 font-normal">
                  Signed ReportLab PDF
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: FLOATING WHITE LOGIN CARD */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl p-7 md:p-8 space-y-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-300">
            {/* Card Header */}
            <div className="text-center space-y-1">
              <span className="text-xs font-medium text-slate-500">
                Welcome to
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                WATERSHED INSIGHT
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Geospatial Evidence Platform
              </p>
            </div>

            {/* Role Segmented Pill Toggle */}
            <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setRoleType('officer')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  roleType === 'officer'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
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
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Users size={14} />
                <span>User Login</span>
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl font-medium">
                  {error}
                </div>
              )}

              {/* Email Input */}
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
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

              {/* Remember me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    alert('Password reset link sent to your official email.')
                  }
                  className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Primary Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
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
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-white px-3 text-slate-400 font-medium">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Government SSO Button */}
            <button
              type="button"
              onClick={() => handleDemoSignIn(DEMO_ACCOUNTS[0])}
              className="w-full bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-2xs"
            >
              <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-700 flex items-center justify-center font-serif text-xs font-black">
                🏛️
              </div>
              <span>Login with Government SSO</span>
              <ArrowRight size={14} className="text-slate-400 ml-auto" />
            </button>

            {/* Quick Demo Sign-in Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowDemoPicker(!showDemoPicker)}
                className="w-full text-center text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
              >
                {showDemoPicker
                  ? '▲ Hide Quick Demo Accounts'
                  : '▼ Select Quick Demo Officer Account (1-Click)'}
              </button>

              {showDemoPicker && (
                <div className="mt-3 space-y-1.5 bg-slate-50 border border-slate-200 rounded-xl p-2 max-h-48 overflow-y-auto animate-in fade-in duration-200">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleDemoSignIn(acc)}
                      className="w-full text-left bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 p-2 rounded-lg transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">
                          {acc.name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {acc.roleTitle}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                        {acc.badge}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Security Badge Footer Box */}
            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-3 text-left">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <ShieldCheck size={14} />
              </div>
              <div className="text-[11px] text-emerald-950 font-medium leading-tight">
                <span className="font-bold block">
                  Secure access for authorized government officers only.
                </span>
                <span className="text-emerald-800/90 text-[10px]">
                  Part of Department of Land Resources, Govt. of India.
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER BAR */}
      <footer className="relative z-20 w-full px-6 py-3 border-t border-white/10 backdrop-blur-md bg-[#080d19]/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-semibold text-emerald-300">
            SRISHTI-DRISHTI ENGINE ACTIVE
          </span>
          <span>•</span>
          <span>
            Department of Land Resources • Ministry of Rural Development
          </span>
        </div>
        <div className="font-mono text-[10px] text-slate-400">
          EPSG:4326 (WGS 84) • 30m Sentinel-2 L2A Multispectral • SIH PS26015
        </div>
      </footer>
    </div>
  )
}
