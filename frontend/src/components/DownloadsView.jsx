import React from 'react'
import {
  Code, Copy, Database, Download, FileCode, FileSpreadsheet, FileText, Globe, Layers, MapPin, Server
} from 'lucide-react'

export default function DownloadsView({ watershedId, onDownload = () => {}, busy = false }) {
  const downloadItems = [
    {
      id: 'geojson',
      title: 'Micro-Watershed Boundary & Delineation',
      type: 'GeoJSON',
      size: '1.2 MB',
      format: '.geojson / EPSG:4326',
      icon: MapPin,
      color: '#047857',
      desc: 'Vector polygons of micro-watershed boundaries, drainage channels, and ridge lines.',
    },
    {
      id: 'geotiff',
      title: 'Sentinel-2 Multi-Spectral Raster Layers',
      type: 'GeoTIFF',
      size: '48.5 MB',
      format: '.tif / COG',
      icon: Layers,
      color: '#0284c7',
      desc: 'High-resolution NDVI vegetation index, NDWI water index, and 10m DEM rasters.',
    },
    {
      id: 'catalog',
      title: 'Intervention Structures Master Registry',
      type: 'CSV / Excel',
      size: '340 KB',
      format: '.csv / .xlsx',
      icon: FileSpreadsheet,
      color: '#d97706',
      desc: 'Complete tabular dataset of all 10 monitored structures, GPS coordinates, costs, and scores.',
    },
    {
      id: 'kml',
      title: 'Google Earth & QGIS Spatial Vector Layer',
      type: 'KML / KMZ',
      size: '2.8 MB',
      format: '.kml / .kmz',
      icon: Globe,
      color: '#7c3aed',
      desc: '3D spatial overlay files formatted for instant viewing in Google Earth and QGIS Desktop.',
    },
    {
      id: 'dossier',
      title: 'Official Executive Watershed Assessment Dossier',
      type: 'PDF Pack',
      size: '4.1 MB',
      format: '.pdf / Signed',
      icon: FileText,
      color: '#e11d48',
      desc: 'Complete government evaluation document with temporal change analysis and impact matrices.',
    },
  ]

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 bg-[#f8fafc] overflow-y-auto text-xs select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <Download size={22} />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-base">Geospatial Data &amp; Downloads Center</h2>
            <div className="text-slate-500 text-[11px] font-medium">
              Open Spatial Datasets • GeoTIFF Rasters • Vector GeoJSON • Automated API Endpoints
            </div>
          </div>
        </div>
      </div>

      {/* Data Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {downloadItems.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between gap-3 hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: item.color }}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <span className="font-mono text-[9px] font-bold text-slate-400 block">{item.format}</span>
                    <h3 className="font-extrabold text-slate-900 text-xs">{item.title}</h3>
                  </div>
                </div>
              </div>

              <p className="text-slate-600 text-[11px] leading-relaxed">{item.desc}</p>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
                <span className="font-mono font-bold text-slate-500">{item.size}</span>
                <button
                  onClick={() => onDownload('watershed', watershedId)}
                  disabled={busy}
                  className="bg-[#047857] hover:bg-[#065f46] text-white font-bold py-1.5 px-3.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Download size={13} />
                  <span>Download Package</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* REST API Access Box */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-4 flex flex-col gap-3 shadow-md border border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
            <Server size={16} />
            <span>Developer REST API Access</span>
          </div>
          <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
            v1.0 ACTIVE
          </span>
        </div>

        <div className="flex flex-col gap-2 text-xs font-mono">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-slate-300 flex items-center justify-between">
            <span>GET /api/v1/watersheds/{watershedId || 'MWS-MH-2025-014'}/summary</span>
            <button className="text-slate-400 hover:text-white cursor-pointer" title="Copy Endpoint">
              <Copy size={13} />
            </button>
          </div>
          <div className="text-[11px] text-slate-400 font-sans">
            Returns real-time geospatial summary, epoch timeseries, structural impact rankings, and vegetation indices in standardized JSON format.
          </div>
        </div>
      </div>
    </div>
  )
}
