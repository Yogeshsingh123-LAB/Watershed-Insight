import React from 'react'
import { ArrowLeft, Lock, ShieldAlert } from 'lucide-react'

export default function ForbiddenPage({ currentUser, onReturnToAuthorized }) {
  return (
    <div className="min-h-screen bg-[#070d19] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl space-y-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 border border-rose-500/40 flex items-center justify-center text-rose-400">
          <ShieldAlert size={32} />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono bg-rose-950 text-rose-300 border border-rose-800 px-2.5 py-1 rounded">
            HTTP 403 FORBIDDEN
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Access Restricted</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your current account role (<strong className="text-slate-200">{currentUser?.roleTitle || currentUser?.role || 'Guest'}</strong>) does not have administrative authorization to access this security portal.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-left text-xs space-y-1 font-mono text-slate-400">
          <div>User: <span className="text-slate-200">{currentUser?.name}</span></div>
          <div>Role: <span className="text-emerald-400">{currentUser?.role}</span></div>
          <div>Security Clearance: <span className="text-rose-400">DENIED</span></div>
        </div>

        <button
          onClick={onReturnToAuthorized}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>Return to Authorized Portal</span>
        </button>
      </div>
    </div>
  )
}
