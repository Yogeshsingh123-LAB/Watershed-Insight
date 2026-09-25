import React, { useState } from 'react'
import { ArrowLeft, CheckCircle2, Compass, Eye, EyeOff, KeyRound, Lock, LogIn, Shield, User, UserPlus } from 'lucide-react'

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
    badge: 'Officer Portal',
  },
  {
    name: 'Amit V. Patil',
    email: 'field.inspector@dolr.gov.in',
    role: 'FIELD_OFFICER',
    roleTitle: 'DRISHTI Field Inspector',
    portal: '/app/verification',
    badge: 'Verification Portal',
  },
  {
    name: 'CA Suresh K. Mehta',
    email: 'auditor@dolr.gov.in',
    role: 'AUDITOR',
    roleTitle: 'Third-Party Compliance Auditor',
    portal: '/app/audit',
    badge: 'Auditor Portal',
  },
  {
    name: 'Super Admin Nodal',
    email: 'admin@dolr.gov.in',
    role: 'ADMIN',
    roleTitle: 'National System Administrator',
    portal: '/app/admin',
    badge: 'Super Admin Portal',
  },
]

export default function LoginPage({ onLoginSuccess, onBackToHome }) {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('district.officer@dolr.gov.in')
  const [password, setPassword] = useState('Govt@2026#DoLR')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState('DISTRICT_OFFICER')

  // Registration state
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regRole, setRegRole] = useState('WATERSHED_OFFICER')
  const [regPassword, setRegPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleDemoSignIn = (acc) => {
    setEmail(acc.email)
    setRole(acc.role)
    const userObj = {
      name: acc.name,
      email: acc.email,
      role: acc.role,
      roleTitle: acc.roleTitle,
      department: 'Department of Land Resources',
      district: 'Pune',
      state: 'Maharashtra',
    }
    onLoginSuccess(userObj, acc.portal)
  }

  const handleLoginSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    setTimeout(() => {
      const match = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase())
      const userRole = match ? match.role : role
      let targetPortal = '/app/officer'
      if (userRole === 'ADMIN') targetPortal = '/app/admin'
      else if (userRole === 'FIELD_OFFICER') targetPortal = '/app/verification'
      else if (userRole === 'AUDITOR') targetPortal = '/app/audit'

      const userObj = {
        name: match ? match.name : email.split('@')[0].replace('.', ' ').toUpperCase(),
        email: email,
        role: userRole,
        roleTitle: match ? match.roleTitle : userRole.replace('_', ' ').toUpperCase(),
        department: 'Department of Land Resources',
        district: 'Pune',
        state: 'Maharashtra',
      }
      setLoading(false)
      onLoginSuccess(userObj, targetPortal)
    }, 350)
  }

  const handleRegisterSubmit = (e) => {
    e.preventDefault()
    if (!regName || !regEmail || !regPassword) {
      setError('Please fill in all required fields.')
      return
    }
    setLoading(true)

    setTimeout(() => {
      let targetPortal = '/app/officer'
      if (regRole === 'ADMIN') targetPortal = '/app/admin'
      else if (regRole === 'FIELD_OFFICER') targetPortal = '/app/verification'
      else if (regRole === 'AUDITOR') targetPortal = '/app/audit'

      const userObj = {
        name: regName,
        email: regEmail,
        role: regRole,
        roleTitle: regRole.replace('_', ' ').toUpperCase(),
        department: 'Department of Land Resources',
        district: 'Pune',
        state: 'Maharashtra',
      }
      setLoading(false)
      onLoginSuccess(userObj, targetPortal)
    }, 400)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4 selection:bg-emerald-600 selection:text-white font-sans">
      {/* Top Back Navigation Button */}
      <button
        onClick={onBackToHome}
        className="fixed top-6 left-6 text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer z-50"
      >
        <ArrowLeft size={15} className="text-slate-500" />
        <span>Return to Main Website</span>
      </button>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl shadow-xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-6 border-b border-slate-200 text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
            <Compass size={26} />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">WATERSHED INSIGHT</h1>
          <p className="text-xs text-slate-500 font-medium">Department of Land Resources • Govt. of India</p>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-100/60 p-1">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              tab === 'login'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn size={15} />
            Officer Sign In
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              tab === 'register'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus size={15} />
            Register Account
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl font-medium">
              {error}
            </div>
          )}

          {tab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Official Email Address
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="officer@dolr.gov.in"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <KeyRound size={15} />
                <span>{loading ? 'Authenticating...' : 'SIGN IN TO PORTAL'}</span>
              </button>

              {/* Quick Demo Role Sign-In Tiles */}
              <div className="pt-4 border-t border-slate-200/80 space-y-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Quick Demo Role Sign-In:
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleDemoSignIn(acc)}
                      className="text-left bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">{acc.name}</div>
                        <div className="text-[10px] text-slate-500">{acc.roleTitle}</div>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-white text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full shadow-2xs">
                        {acc.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name *</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                  placeholder="e.g. Dr. Ramesh Verma"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Official Email *</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  placeholder="ramesh.verma@nic.in"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Assigned Role *</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-emerald-700 font-bold focus:outline-none focus:border-emerald-600"
                >
                  <option value="DISTRICT_OFFICER">District Collector / Nodal Officer</option>
                  <option value="WATERSHED_OFFICER">Watershed Team Lead (WDT)</option>
                  <option value="FIELD_OFFICER">Verification Field Inspector</option>
                  <option value="AUDITOR">Third-Party Auditor</option>
                  <option value="ADMIN">Super System Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Password *</label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <UserPlus size={15} />
                <span>{loading ? 'Creating Account...' : 'REGISTER OFFICER ACCOUNT'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
