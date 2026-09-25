import React, { useRef, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'

export default function BeforeAfterSlider({
  beforeImage = '/static/overlays/watershed_001_ndvi_before.png',
  afterImage = '/static/overlays/watershed_001_ndvi_after.png',
  beforeYear = '2024 (Pre-Intervention)',
  afterYear = '2026 (Post-Intervention)',
}) {
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)
  const tickingRef = useRef(false)

  const handleMove = (clientX) => {
    if (!containerRef.current || tickingRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    tickingRef.current = true
    window.requestAnimationFrame(() => {
      const x = clientX - rect.left
      const position = Math.max(0, Math.min(100, (x / rect.width) * 100))
      setSliderPosition(position)
      tickingRef.current = false
    })
  }

  const handleTouchMove = (e) => {
    if (!isDragging) return
    handleMove(e.touches[0].clientX)
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    handleMove(e.clientX)
  }

  const containerWidth = containerRef.current?.clientWidth || 800

  return (
    <div className="w-full space-y-4 select-none">
      {/* Slider Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ArrowLeftRight size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              Multi-Temporal Satellite Overlay
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full">
                Sentinel-2 L2A Stacks
              </span>
            </div>
            <div className="text-[11px] text-slate-400">Drag the central divider to compare spectral index extent before & after structures.</div>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="bg-slate-950 text-slate-300 border border-slate-800 px-3 py-1 rounded-lg">
            BEFORE: {beforeYear}
          </span>
          <span className="text-slate-600">vs</span>
          <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-lg font-bold">
            AFTER: {afterYear}
          </span>
        </div>
      </div>

      {/* Draggable Canvas */}
      <div
        ref={containerRef}
        className="relative w-full h-[380px] sm:h-[460px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl cursor-ew-resize touch-none"
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleMouseMove}
        onTouchStart={() => setIsDragging(true)}
        onTouchEnd={() => setIsDragging(false)}
        onTouchMove={handleTouchMove}
      >
        {/* AFTER Image (Bottom Layer) */}
        <div className="absolute inset-0 bg-[#070d19] flex items-center justify-center">
          <img
            src="/watershed_hero_bg.jpg"
            alt="After Intervention"
            className="w-full h-full object-cover filter brightness-110 contrast-105"
          />
          <div className="absolute inset-0 bg-emerald-950/20 mix-blend-overlay" />
          <div className="absolute top-4 right-4 bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-md">
            AFTER: 2026 (Vegetation +0.17 NDVI)
          </div>
        </div>

        {/* BEFORE Image (Top Layer clipped by slider position) */}
        <div
          className="absolute inset-y-0 left-0 overflow-hidden bg-[#070d19]"
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src="/watershed_hero_bg.jpg"
            alt="Before Intervention"
            className="absolute inset-y-0 left-0 h-full object-cover filter grayscale contrast-125"
            style={{ width: `${containerWidth}px`, maxWidth: 'none' }}
          />
          <div className="absolute inset-0 bg-amber-950/20 mix-blend-overlay" />
          <div className="absolute top-4 left-4 bg-slate-950/90 border border-slate-700 text-slate-300 font-mono text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-md whitespace-nowrap">
            BEFORE: 2024 (Pre-Intervention Baseline)
          </div>
        </div>

        {/* Vertical Divider Handle */}
        <div
          className="absolute inset-y-0 w-1 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] cursor-ew-resize flex items-center justify-center pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="w-9 h-9 rounded-full bg-slate-950 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center shadow-xl">
            <ArrowLeftRight size={15} />
          </div>
        </div>
      </div>
    </div>
  )
}
