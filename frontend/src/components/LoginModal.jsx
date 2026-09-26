import React, { useState } from 'react'
import { KeyRound, Lock, LogIn, Shield, User, UserPlus, X } from 'lucide-react'

const DEMO_OFFICERS = [
  {
    name: 'Dr. Rajesh Kumar Sharma',
    email: 'district.officer@dolr.gov.in',
    role: 'DISTRICT_OFFICER',
    roleTitle: 'District Collector / Nodal Officer',
    dept: 'Department of Land Resources',
  },
  {
    name: 'Priya Deshmukh',
    email: 'watershed.officer@dolr.gov.in',
    role: 'WATERSHED_OFFICER',
    roleTitle: 'Watershed Development Team Lead',
    dept: 'WDT Monitoring Cell',
  },
  {
    name: 'Amit V. Patil',
    email: 'field.inspector@dolr.gov.in',
    role: 'FIELD_OFFICER',
    roleTitle: 'DRISHTI Field Inspector',
    dept: 'Field Monitoring Unit',
  },
  {
    name: 'Super Admin',
    email: 'admin@dolr.gov.in',
    role: 'ADMIN',
    roleTitle: 'National System Administrator',
    dept: 'DoLR HQ New Delhi',
  },
]

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [tab, setTab] = useState('login')

  const [email, setEmail] = useState('district.officer@dolr.gov.in')
  const [password, setPassword] = useState('Govt@2026#DoLR')
  const [role, setRole] = useState('DISTRICT_OFFICER')

  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regRole, setRegRole] = useState('WATERSHED_OFFICER')
  const [regDept, setRegDept] = useState('Department of Land Resources')
  const [regDistrict, setRegDistrict] = useState('Pune')
  const [regState, setRegState] = useState('Maharashtra')
  const [regPassword, setRegPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleQuickLogin = (officer) => {
    setEmail(officer.email)
    setRole(officer.role)
    const userObj = {
      name: officer.name,
      email: officer.email,
      role: officer.role,
      roleTitle: officer.roleTitle,
      department: officer.dept,
      district: 'Pune',
      state: 'Maharashtra',
    }
    onLoginSuccess(userObj)
    onClose()
  }

  const handleLoginSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    setTimeout(() => {
      const selectedDemo = DEMO_OFFICERS.find((o) => o.email.toLowerCase() === email.toLowerCase())
      const userObj = {
        name: selectedDemo ? selectedDemo.name : email.split('@')[0].replace('.', ' ').toUpperCase(),
        email: email,
        role: role,
        roleTitle: role.replace('_', ' ').toUpperCase(),
        department: selectedDemo ? selectedDemo.dept : 'Department of Land Resources',
        district: 'Pune',
        state: 'Maharashtra',
      }
      setLoading(false)
      onLoginSuccess(userObj)
      onClose()
    }, 400)
  }

  const handleRegisterSubmit = (e) => {
    e.preventDefault()
    if (!regName || !regEmail || !regPassword) {
      setError('Please fill in all required fields.')
      return
    }
    setLoading(true)

    setTimeout(() => {
      const userObj = {
        name: regName,
        email: regEmail,
        role: regRole,
        roleTitle: regRole.replace('_', ' ').toUpperCase(),
        department: regDept,
        district: regDistrict,
        state: regState,
      }
      setLoading(false)
      onLoginSuccess(userObj)
      onClose()
    }, 400)
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 selection:bg-emerald-600 selection:text-white font-sans animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="bg-slate-50 px-6 py-6 border-b border-slate-200 text-center space-y-1.5 flex flex-col items-center">
          <img src="/dharascan_logo.png" alt="DharaScan Logo" className="h-12 w-auto object-contain mb-1" />
          <h2 className="text-lg font-black text-slate-900 tracking-tight">DharaScan Officer Portal Access</h2>
          <p className="text-xs text-slate-500 font-medium">Department of Land Resources • Govt. of India</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-100/60 p-1">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              tab === 'login' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn size={14} />
            Officer Sign In
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              tab === 'register' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus size={14} />
            Register Account
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
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
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3 py-2.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <KeyRound size={15} />
                <span>{loading ? 'Authenticating...' : 'SIGN IN TO PORTAL'}</span>
              </button>

              {/* Quick Demo Sign-In */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Quick Demo Login:</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {DEMO_OFFICERS.map((o) => (
                    <button
                      key={o.email}
                      type="button"
                      onClick={() => handleQuickLogin(o)}
                      className="text-left bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 px-3 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">{o.name}</div>
                        <div className="text-[10px] text-slate-500">{o.roleTitle}</div>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-white text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Login
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name *</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                  placeholder="Dr. Ramesh Verma"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-emerald-600"
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Role *</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-emerald-700 font-bold focus:outline-none focus:border-emerald-600"
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center justify-center gap-2 mt-2"
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
