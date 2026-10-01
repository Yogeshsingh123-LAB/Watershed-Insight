import React, { useState } from 'react'
import {
  ArrowRight,
  ChevronRight,
  Compass,
  Eye,
  EyeOff,
  Lock,
  Mail,
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
        roleTitle: match ? match.roleTitle : 'Government Officer',
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
    <div className="h-screen w-full bg-[#F7F9FC] text-[#101B35] flex flex-col justify-between font-sans overflow-hidden selection:bg-[#009F73] selection:text-white">
      {/* ========================================================================= */}
      {/* TOP NAVIGATION BAR (Fixed height: 64px)                                   */}
      {/* ========================================================================= */}
      <header className="h-[64px] shrink-0 w-full bg-white border-b border-slate-200/90 px-6 lg:px-10 flex items-center justify-between z-40 shadow-2xs">
        {/* Left: Brand Logo & Title & Government Badge */}
        <div
          onClick={onBackToHome}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-full bg-[#009F73] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-black text-[#101B35] tracking-tight font-sans uppercase">
                WATERSHED INSIGHT
              </h1>
              <span className="text-xs font-semibold bg-[#E6F4EA] text-[#009F73] border border-[#a7f3d0] px-3 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#009F73]" />
                DoLR • Govt. of India
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium -mt-0.5">
              Geospatial Evidence Platform
            </p>
          </div>
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#101B35]">
          <button
            onClick={onBackToHome}
            className="text-[#101B35] font-bold hover:text-[#009F73] transition-colors cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={() => handleDemoSignIn(DEMO_ACCOUNTS[0])}
            className="text-slate-600 hover:text-[#101B35] transition-colors cursor-pointer"
          >
            3D Geospatial
          </button>
          <button
            onClick={onBackToHome}
            className="text-slate-600 hover:text-[#101B35] transition-colors cursor-pointer"
          >
            Capabilities
          </button>
          <button
            onClick={onBackToHome}
            className="text-slate-600 hover:text-[#101B35] transition-colors cursor-pointer"
          >
            Multi-Temporal
          </button>
          <button
            onClick={onBackToHome}
            className="text-slate-600 hover:text-[#101B35] transition-colors cursor-pointer"
          >
            Auditability
          </button>
        </nav>

        {/* Right: Explore Map Button */}
        <button
          onClick={() => handleDemoSignIn(DEMO_ACCOUNTS[0])}
          className="flex items-center gap-2 bg-white border border-slate-300 hover:border-slate-400 text-[#101B35] text-xs font-semibold px-4 py-2 rounded-full shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
        >
          <Compass size={14} className="text-[#009F73] stroke-[2.5]" />
          <span>Explore Map</span>
        </button>
      </header>

      {/* ========================================================================= */}
      {/* SPLIT-SCREEN MAIN AREA (Height: calc(100vh - 64px))                      */}
      {/* ========================================================================= */}
      <main className="h-[calc(100vh-64px)] w-full flex flex-col lg:flex-row overflow-hidden relative">
        {/* ===================================================================== */}
        {/* LEFT HERO SECTION (58% Width): HIGH DEFINITION GEOSPATIAL ARTWORK      */}
        {/* ===================================================================== */}
        <div className="lg:w-[58%] h-full relative bg-[#061525] flex items-center justify-center overflow-hidden shrink-0">
          <img
            src="/watershed_hero_full.jpg"
            alt="Watershed Geospatial Intelligence Platform"
            className="w-full h-full object-cover object-left-top filter brightness-[1.02] contrast-[1.03] transition-transform duration-700 hover:scale-[1.01]"
          />
        </div>

        {/* ===================================================================== */}
        {/* RIGHT LOGIN PANEL (42% Width): CENTERED FLOATING CARD                 */}
        {/* ===================================================================== */}
        <div className="lg:w-[42%] h-full bg-[#F7F9FC] p-6 lg:p-8 flex items-center justify-center overflow-y-auto relative">
          {/* Main Floating White Card */}
          <div className="w-full max-w-[420px] bg-white rounded-[28px] p-7 lg:p-8 shadow-[0_20px_60px_-15px_rgba(16,27,53,0.07)] border border-slate-200/90 space-y-5 my-auto relative z-10">
            {/* Logo Badge & Header */}
            <div className="text-center space-y-1 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-[#009F73] text-white flex items-center justify-center shadow-md shadow-[#009F73]/20 mb-1.5">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-500">
                Welcome to
              </p>
              <h2 className="text-2xl sm:text-[28px] font-black text-[#101B35] tracking-tight font-sans uppercase">
                WATERSHED INSIGHT
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Official Government Portal
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-medium">
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#101B35]">
                  Official Email ID
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
                    className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#009F73] focus:bg-white focus:ring-2 focus:ring-[#009F73]/20 rounded-xl pl-10 pr-4 py-3 text-xs font-medium text-[#101B35] placeholder-slate-400 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#101B35]">
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
                    className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#009F73] focus:bg-white focus:ring-2 focus:ring-[#009F73]/20 rounded-xl pl-10 pr-10 py-3 text-xs font-medium text-[#101B35] placeholder-slate-400 outline-none transition-all"
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

              {/* Checkbox & Forgot Link */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#009F73] focus:ring-[#009F73] accent-[#009F73] cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() =>
                    alert('Password reset instructions sent to registered email.')
                  }
                  className="font-bold text-[#009F73] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Main Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#009F73] hover:bg-[#008762] text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md shadow-[#009F73]/20 flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                <span>{loading ? 'Authenticating...' : 'Login'}</span>
                <ArrowRight size={16} />
              </button>
            </form>

            {/* Government SSO Section */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[11px]">
                <span className="bg-white px-3 text-slate-400 font-medium">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDemoSignIn(DEMO_ACCOUNTS[0])}
              className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-[#101B35] text-xs font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-between cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-[#101B35] fill-current" viewBox="0 0 24 24">
                  <path d="M12 2L2 7v3c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 13.5c-2.7-1.12-5-4.48-5-7.5v-3.7l5-2.5 5 2.5V12c0 3.02-2.3 6.38-5 7.5z"/>
                </svg>
                <span>Login with Government SSO</span>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>

            {/* Quick Demo Sign-in Selector */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setShowDemoPicker(!showDemoPicker)}
                className="w-full text-center text-[11px] font-bold text-[#009F73] hover:underline cursor-pointer"
              >
                {showDemoPicker
                  ? '▲ Hide Demo Roles'
                  : '▼ Quick Select Demo Officer Role (1-Click)'}
              </button>

              {showDemoPicker && (
                <div className="mt-2 space-y-1 bg-slate-50 border border-slate-200 rounded-xl p-2 max-h-40 overflow-y-auto">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleDemoSignIn(acc)}
                      className="w-full text-left bg-white hover:bg-emerald-50/80 border border-slate-200 p-2 rounded-lg transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div>
                        <div className="text-xs font-bold text-[#101B35] group-hover:text-[#009F73]">
                          {acc.name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {acc.roleTitle}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-[#E6F4EA] text-[#009F73] px-2 py-0.5 rounded">
                        {acc.badge}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Security Notice Box */}
            <div className="bg-[#E6F4EA] border border-[#a7f3d0] rounded-2xl p-3 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#009F73] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <ShieldCheck size={14} />
              </div>
              <div className="text-[11px] text-[#101B35] font-medium leading-snug">
                <span className="font-bold block text-[#101B35]">
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




