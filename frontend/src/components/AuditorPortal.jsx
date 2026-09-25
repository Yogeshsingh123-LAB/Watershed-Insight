import React, { useState } from 'react'
import AuditTrailPanel from './AuditTrailPanel'
import { FileCheck, Filter, ShieldCheck } from 'lucide-react'

export default function AuditorPortal({ currentUser }) {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-950 text-purple-300 border border-purple-800 px-2.5 py-0.5 rounded">
              Auditor Compliance Access (Read-Only)
            </span>
            <span className="text-xs text-slate-400 font-mono">DoLR / Independent Audit & Assurance</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Auditor & Compliance Ledger</h1>
          <p className="text-xs text-slate-400">
            Read-only access to historical assessment decisions, SHA-256 evidence hashes, user action logs, and signed PDF dossiers.
          </p>
        </div>
        <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-3 py-1.5 rounded-lg font-mono flex items-center gap-2">
          <ShieldCheck size={14} />
          AUDITOR: {currentUser?.name}
        </span>
      </div>

      {/* Embedded Audit Trail Panel with Read-Only Indicator */}
      <div className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <FileCheck size={15} className="text-purple-400" />
            <span>Read-Only Compliance View Enabled — Historical Modification Guard Active</span>
          </div>
          <span className="font-mono text-[10px] text-emerald-400">Immutable SHA-256 Verified</span>
        </div>

        <AuditTrailPanel />
      </div>
    </div>
  )
}
