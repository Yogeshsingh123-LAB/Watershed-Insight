import React from 'react'
import {
  BookOpen, Download, ExternalLink, FileText, Globe, HelpCircle, Info, ShieldCheck, Video
} from 'lucide-react'

export default function ResourcesView() {
  const manuals = [
    {
      title: 'PMKSY WDC 2.0 Operational Guidelines (2021 - 2026)',
      authority: 'Department of Land Resources, Govt. of India',
      desc: 'Official policy framework, financial norms, and execution guidelines for micro-watershed development.',
      pages: '148 Pages',
      icon: BookOpen,
      color: '#047857',
    },
    {
      title: 'Srishti-Drishti Geo-tagging & Field Inspection Manual',
      authority: 'National Remote Sensing Centre (NRSC / ISRO)',
      desc: 'Standard operating procedures for field officers conducting mobile geo-tagged photo verification.',
      pages: '42 Pages',
      icon: FileText,
      color: '#0284c7',
    },
    {
      title: 'ISRO Bhuvan Spatial Data Quality Assurance Handbook',
      authority: 'Indian Space Research Organisation (ISRO)',
      desc: 'Technical specifications for spatial vector accuracy, WGS84 projection, and Sentinel satellite calibration.',
      pages: '86 Pages',
      icon: Globe,
      color: '#7c3aed',
    },
    {
      title: 'Remote Sensing & NDVI Vegetation Index Methodology',
      authority: 'Space Applications Centre (SAC), Ahmedabad',
      desc: 'Mathematical formulas and surface reflectance algorithms used for computing temporal delta indices.',
      pages: '35 Pages',
      icon: Info,
      color: '#d97706',
    },
  ]

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 bg-[#f8fafc] overflow-y-auto text-xs select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <BookOpen size={22} />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-base">Technical Guidelines &amp; Knowledge Resources</h2>
            <div className="text-slate-500 text-[11px] font-medium">
              Department of Land Resources • PMKSY WDC 2.0 Framework • ISRO Bhuvan GIS Documentation
            </div>
          </div>
        </div>
      </div>

      {/* Manuals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {manuals.map((item, idx) => {
          const Icon = item.icon
          return (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between gap-3 hover:border-slate-300 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0" style={{ background: item.color }}>
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{item.title}</h3>
                  <span className="text-emerald-700 font-semibold text-[11px] block mt-0.5">{item.authority}</span>
                </div>
              </div>

              <p className="text-slate-600 text-[11px] leading-relaxed">{item.desc}</p>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
                <span className="font-mono font-bold text-slate-400">{item.pages}</span>
                <button className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-3.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer">
                  <Download size={13} />
                  <span>Download PDF Document</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Video Training Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col gap-3">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-xs border-b border-slate-100 pb-2">
          <Video size={16} className="text-emerald-700" />
          <span>Interactive Training &amp; Video Walkthroughs</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'Officer Onboarding & System Overview', duration: '12 mins' },
            { title: 'Field Inspection Geo-Tagging Mobile App', duration: '18 mins' },
            { title: 'Spatial Delta Analysis & Report Export', duration: '15 mins' },
          ].map((v, i) => (
            <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 text-xs">{v.title}</span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5">Duration: {v.duration}</span>
              </div>
              <button className="text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer" title="Watch Video">
                <ExternalLink size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
