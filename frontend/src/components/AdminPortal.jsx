import React, { useState } from 'react'
import { Activity, Database, Key, Layers, RefreshCw, Shield, ShieldCheck, UserCheck, Users } from 'lucide-react'

export default function AdminPortal({ currentUser }) {
  const [users, setUsers] = useState([
    { id: 'USR-001', name: 'Dr. Rajesh Kumar Sharma', email: 'district.officer@dolr.gov.in', role: 'DISTRICT_OFFICER', dept: 'Department of Land Resources', status: 'ACTIVE' },
    { id: 'USR-002', name: 'Priya Deshmukh', email: 'watershed.officer@dolr.gov.in', role: 'WATERSHED_OFFICER', dept: 'WDT Monitoring Cell', status: 'ACTIVE' },
    { id: 'USR-003', name: 'Amit V. Patil', email: 'field.inspector@dolr.gov.in', role: 'FIELD_OFFICER', dept: 'Field Inspection Unit', status: 'ACTIVE' },
    { id: 'USR-004', name: 'Super Admin Nodal', email: 'admin@dolr.gov.in', role: 'ADMIN', dept: 'DoLR HQ New Delhi', status: 'ACTIVE' },
  ])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-950 text-rose-300 border border-rose-800 px-2.5 py-0.5 rounded">
              Super Admin Security Clearance
            </span>
            <span className="text-xs text-slate-400 font-mono">DoLR / System Administration</span>
          </div>
          <h1 className="text-2xl font-bold text-white">System Administration & Portal Governance</h1>
          <p className="text-xs text-slate-400">
            User account management, role authorization matrices, data source pipeline health, and security controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-3 py-1.5 rounded-lg font-mono flex items-center gap-2">
            <ShieldCheck size={14} />
            ADMIN: {currentUser?.name}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <Users size={14} className="text-sky-400" /> Total Users
          </div>
          <div className="text-2xl font-extrabold text-white">24</div>
          <div className="text-[10px] text-emerald-400">100% Authorized</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <UserCheck size={14} className="text-emerald-400" /> Active Sessions
          </div>
          <div className="text-2xl font-extrabold text-white">5</div>
          <div className="text-[10px] text-slate-400">Real-time JWT Sessions</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <Database size={14} className="text-amber-400" /> Data Sources
          </div>
          <div className="text-2xl font-extrabold text-white">4 / 4</div>
          <div className="text-[10px] text-emerald-400">SRISHTI + DRISHTI Connected</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <Activity size={14} className="text-purple-400" /> Pipeline Status
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">ONLINE</div>
          <div className="text-[10px] text-slate-400">Sentinel-2 Sync: 100% OK</div>
        </div>
      </div>

      {/* User Management Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield size={16} className="text-sky-400" />
            Registered Government Officer Accounts
          </h3>
          <span className="text-xs text-slate-400">4 Active Accounts</span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
              <tr>
                <th className="p-3">User ID</th>
                <th className="p-3">Officer Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Assigned Role</th>
                <th className="p-3">Department</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/50">
                  <td className="p-3 font-mono text-emerald-400 font-bold">{u.id}</td>
                  <td className="p-3 font-semibold text-white">{u.name}</td>
                  <td className="p-3 text-slate-400 font-mono">{u.email}</td>
                  <td className="p-3">
                    <span className="bg-slate-800 text-sky-300 px-2 py-0.5 rounded font-mono text-[10px]">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">{u.dept}</td>
                  <td className="p-3">
                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
