import React, { useState } from 'react'
import {
  CheckCircle2, Headphones, HelpCircle, Mail, MapPin, Phone, Send, Server, ShieldCheck
} from 'lucide-react'

export default function SupportView() {
  const [ticket, setTicket] = useState({
    category: 'geotagging',
    subject: '',
    description: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setTicket({ category: 'geotagging', subject: '', description: '' })
    }, 4000)
  }

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 bg-[#f8fafc] overflow-y-auto text-xs select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <HelpCircle size={22} />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-base">Helpdesk &amp; Technical Support Center</h2>
            <div className="text-slate-500 text-[11px] font-medium">
              Department of Land Resources • Ministry of Rural Development • System Diagnostics &amp; Ticket Resolution
            </div>
          </div>
        </div>
      </div>

      {/* Live System Diagnostics */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-4 shadow-md border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
            <Server size={16} />
            <span>Srishti-Drishti Engine System Diagnostics</span>
          </div>
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            ALL SYSTEMS OPERATIONAL
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-1">
            <span className="text-slate-400 text-[10px]">FASTAPI ANALYTICS ENGINE</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={12} /> ONLINE (12ms)
            </span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-1">
            <span className="text-slate-400 text-[10px]">POSTGIS SPATIAL DATABASE</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={12} /> CONNECTED
            </span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-1">
            <span className="text-slate-400 text-[10px]">ISRO BHUVAN SATELLITE STREAM</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={12} /> ACTIVE FEED
            </span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-1">
            <span className="text-slate-400 text-[10px]">RASTER TILE SERVER</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={12} /> ONLINE
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ticket Form (2 Cols) */}
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col gap-3">
          <div className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-2">
            Submit Support Request / Ticket
          </div>

          {submitted ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-bold text-sm">Ticket Submitted Successfully!</h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Ticket Reference ID: <b className="font-mono">TKT-2025-98412</b>. Our technical support team will contact you within 2 hours.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-slate-600 font-semibold text-[11px]">Issue Category</label>
                <select
                  value={ticket.category}
                  onChange={(e) => setTicket({ ...ticket, category: e.target.value })}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-medium text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="geotagging">Field Photo Geo-Tagging Sync</option>
                  <option value="satellite">Satellite Raster Overlay Discrepancy</option>
                  <option value="boundary">Micro-Watershed Boundary Error</option>
                  <option value="account">Officer Profile &amp; Role Permissions</option>
                  <option value="api">API Endpoint Access</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-600 font-semibold text-[11px]">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary of the issue..."
                  value={ticket.subject}
                  onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-600 font-semibold text-[11px]">Detailed Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide details about the micro-watershed ID, step to reproduce..."
                  value={ticket.description}
                  onChange={(e) => setTicket({ ...ticket, description: e.target.value })}
                  className="bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="bg-[#047857] hover:bg-[#065f46] text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer self-start"
              >
                <Send size={14} />
                <span>Submit Ticket</span>
              </button>
            </form>
          )}
        </div>

        {/* Contact Directory (1 Col) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col gap-3">
          <div className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-2">
            Official Directory &amp; Hotline
          </div>

          <div className="flex flex-col gap-3 text-slate-700 text-xs">
            <div className="flex items-start gap-2.5">
              <MapPin size={16} className="text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Department of Land Resources</span>
                <span className="text-slate-500 text-[11px] block">Ministry of Rural Development</span>
                <span className="text-slate-500 text-[11px] block">NBO Building, Nirman Bhawan, New Delhi - 110011</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 border-t border-slate-100 pt-2.5">
              <Phone size={16} className="text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold text-slate-900 block">Toll-Free National Helpline</span>
                <span className="font-mono font-bold text-emerald-700 text-xs block">1800-11-2025</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 border-t border-slate-100 pt-2.5">
              <Mail size={16} className="text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold text-slate-900 block">Technical Support Email</span>
                <span className="font-mono text-slate-700 text-[11px] block">support-watershed@nic.in</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
