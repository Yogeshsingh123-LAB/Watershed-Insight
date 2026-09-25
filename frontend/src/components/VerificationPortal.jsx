import React, { useState } from 'react'
import { AlertCircle, CheckCircle2, Clock, Eye, MapPin, ShieldCheck, XCircle } from 'lucide-react'

export default function VerificationPortal({ currentUser }) {
  const [queue, setQueue] = useState([
    { id: 'IMG-20251128-013', photo: '/static/photos/thumbnails/IMG_20251128_013.jpg', structure: 'INT-PT-003', type: 'Percolation Tank', dist: '12.4m', time: '2025-11-28', status: 'PENDING' },
    { id: 'IMG-20260307-019', photo: '/static/photos/thumbnails/IMG_20260307_019.jpg', structure: 'INT-CD-001', type: 'Check Dam', dist: '48.2m', time: '2026-03-07', status: 'PENDING' },
    { id: 'IMG-20260202-003', photo: '/static/photos/thumbnails/IMG_20260202_003.jpg', structure: 'INT-FP-002', type: 'Farm Pond', dist: '5.1m', time: '2026-02-02', status: 'VERIFIED' },
  ])

  const handleVerify = (id) => {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status: 'VERIFIED' } : q)))
  }

  const handleReject = (id) => {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status: 'REJECTED' } : q)))
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800 px-2.5 py-0.5 rounded">
              Verification Officer Clearance
            </span>
            <span className="text-xs text-slate-400 font-mono">DRISHTI Mobile Photo Validation</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Field Evidence Verification Queue</h1>
          <p className="text-xs text-slate-400">
            Review geotagged ground photographs, EXIF GPS accuracy, centroid distance validation (≤ 50m), and image quality.
          </p>
        </div>
        <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-3 py-1.5 rounded-lg font-mono flex items-center gap-2">
          <ShieldCheck size={14} />
          INSPECTOR: {currentUser?.name}
        </span>
      </div>

      {/* Queue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {queue.map((item) => (
          <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col">
            <div className="h-44 bg-slate-950 relative overflow-hidden flex items-center justify-center">
              <img
                src={item.photo}
                alt={item.id}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <span className="absolute top-2 left-2 bg-slate-950/90 text-slate-200 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700">
                {item.id}
              </span>
              <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                item.status === 'VERIFIED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                item.status === 'REJECTED' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {item.status}
              </span>
            </div>

            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-bold text-white">
                  <span>Structure: {item.structure}</span>
                  <span className="text-[10px] text-slate-400">{item.type}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-emerald-400" />
                    Proximity: {item.dist} (≤ 50m)
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-sky-400" />
                    Date: {item.time}
                  </span>
                </div>
              </div>

              {item.status === 'PENDING' ? (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleVerify(item.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 rounded transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    <span>Verify</span>
                  </button>
                  <button
                    onClick={() => handleReject(item.id)}
                    className="bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs py-2 rounded transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <XCircle size={14} />
                    <span>Reject</span>
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 text-center py-1 bg-slate-950 rounded border border-slate-800">
                  Decision Logged in Audit Trail
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
