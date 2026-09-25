import React, { useEffect, useRef, useState } from 'react'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle2,
  Clock,
  Compass,
  Database,
  Eye,
  FileCheck2,
  FileText,
  Globe2,
  HelpCircle,
  Info,
  Layers,
  Link as LinkIcon,
  Lock,
  LogIn,
  MapPin,
  Menu,
  Mountain,
  Navigation,
  RotateCw,
  Satellite,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  Target,
  TrendingUp,
  User,
  X,
  Zap,
} from 'lucide-react'
import CinematicTerrain3D from './CinematicTerrain3D'
import BeforeAfterSlider from './BeforeAfterSlider'

/** Reusable Scroll-Reveal Component for smooth page-by-page scrolling animations */
function ScrollReveal({ children, className = '' }) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Immediately trigger if element is already in viewport
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight) {
      setIsVisible(true)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { rootMargin: '0px 0px -40px 0px', threshold: 0.02 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out will-change-transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      } ${className}`}
    >
      {children}
    </div>
  )
}

export default function LandingPage({ onLoginClick, onExploreClick }) {
  const [activeLayer, setActiveLayer] = useState('satellite')
  const [cameraMode, setCameraMode] = useState('overview')
  const [hoveredMarker, setHoveredMarker] = useState(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Track page scroll progress with RAF throttling for high performance
  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const totalScroll = document.documentElement.scrollHeight - window.innerHeight
          const currentScroll = window.scrollY
          const progress = Math.min(1, Math.max(0, currentScroll / (totalScroll || 1)))
          setScrollProgress((prev) => (Math.abs(prev - progress) > 0.005 ? progress : prev))
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id) => {
    setMobileMenuOpen(false)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const NAV_LINKS = [
    { id: 'hero', label: 'Home' },
    { id: 'terrain-3d', label: '3D Geospatial' },
    { id: 'bento', label: 'Capabilities' },
    { id: 'temporal', label: 'Multi-Temporal' },
    { id: 'auditability', label: 'Auditability' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-600 selection:text-white flex flex-col overflow-x-hidden">
      {/* ------------------- 1. CLEAN RESPONSIVE TOP NAVIGATION ------------------- */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-6 lg:px-12 py-3 flex items-center justify-between shadow-xs transition-all">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 shrink-0">
            <Compass size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5 truncate">
              <span className="truncate">WATERSHED INSIGHT</span>
              <span className="hidden sm:inline-block text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold px-2 py-0.5 rounded-full shrink-0">
                DoLR • Govt. of India
              </span>
            </h1>
            <p className="text-[9px] sm:text-[10px] text-slate-500 font-semibold truncate">Geospatial Evidence Platform</p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-2 lg:gap-4 font-bold text-xs sm:text-sm text-slate-700">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollToSection(link.id)}
              className="hover:text-emerald-700 hover:bg-slate-100/90 px-3 py-1.5 rounded-full transition-all cursor-pointer"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Action Buttons & Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onExploreClick}
            className="hidden sm:flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2 rounded-full border border-slate-300 transition-all cursor-pointer"
          >
            <Compass size={14} className="text-emerald-600" />
            <span>Explore Map</span>
          </button>
          <button
            onClick={onLoginClick}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 sm:px-5 sm:py-2.5 rounded-full transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <User size={14} />
            <span>Officer Login</span>
          </button>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Slide-Down Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-[60px] z-40 bg-white border-b border-slate-200 p-4 shadow-xl flex flex-col gap-2 font-bold text-sm md:hidden animate-in slide-in-from-top duration-200">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollToSection(link.id)}
              className="text-left px-4 py-2.5 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              {link.label}
            </button>
          ))}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => { setMobileMenuOpen(false); onExploreClick() }}
              className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-800 py-2.5 rounded-xl text-xs font-bold"
            >
              <Compass size={14} className="text-emerald-600" />
              <span>Explore Interactive Map</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------- PAGE 1: HERO SECTION (LIGHT THEME) ------------------- */}
      <section id="hero" className="relative min-h-[90vh] pt-24 sm:pt-28 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto flex flex-col items-center text-center space-y-8 sm:space-y-10 justify-center">
        <ScrollReveal className="space-y-6 sm:space-y-8 flex flex-col items-center w-full">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-emerald-50 border border-emerald-200 px-3.5 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-[11px] font-mono font-bold text-emerald-700 tracking-wide shadow-xs">
            <Zap size={13} className="text-emerald-600 shrink-0" />
            <span className="truncate">NATIONAL GEOSPATIAL DECISION SUPPORT PLATFORM</span>
          </div>

          {/* Main Headline */}
          <div className="space-y-3 sm:space-y-4 max-w-4xl">
            <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black tracking-tight text-slate-900 leading-tight uppercase">
              Geospatial Intelligence.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600">
                Powered by Pixels & Proof.
              </span>
            </h1>
            <p className="text-xs sm:text-base text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
              Integrating 30m Sentinel multispectral satellite observation, geo-coded DRISHTI field evidence, and elevation hydrology into an auditable decision-support system.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={onExploreClick}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm px-6 sm:px-8 py-3.5 sm:py-4 rounded-full transition-all shadow-xl shadow-emerald-600/25 cursor-pointer hover:scale-105"
            >
              <span>Launch Web-GIS Explorer</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={onLoginClick}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold text-xs sm:text-sm px-5 sm:px-7 py-3.5 sm:py-4 rounded-full transition-all cursor-pointer"
            >
              <Lock size={15} className="text-slate-500" />
              <span>Officer Login</span>
            </button>
          </div>

          {/* Verification Spec Chips */}
          <div className="pt-6 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 text-xs font-mono text-slate-600 w-full max-w-3xl">
            <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-2xl shadow-xs text-left sm:text-center">
              <div className="text-slate-900 font-bold text-xs sm:text-base">30m Sentinel-2</div>
              <div className="text-[9px] sm:text-[10px] text-slate-500">Multispectral Stacks</div>
            </div>
            <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-2xl shadow-xs text-left sm:text-center">
              <div className="text-emerald-700 font-bold text-xs sm:text-base">DRISHTI EXIF</div>
              <div className="text-[9px] sm:text-[10px] text-slate-500">Geo-Tagged Field Photos</div>
            </div>
            <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-2xl shadow-xs text-left sm:text-center">
              <div className="text-sky-700 font-bold text-xs sm:text-base">250m Buffer</div>
              <div className="text-[9px] sm:text-[10px] text-slate-500">Hydrological Zonal Stats</div>
            </div>
            <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-2xl shadow-xs text-left sm:text-center">
              <div className="text-amber-700 font-bold text-xs sm:text-base">100% Auditable</div>
              <div className="text-[9px] sm:text-[10px] text-slate-500">Signed ReportLab PDF</div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ------------------- PAGE 2: 3D GEOSPATIAL EXPLORER STAGE ------------------- */}
      <section id="terrain-3d" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-12 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          <ScrollReveal className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="text-xs font-mono font-bold text-emerald-700 tracking-wider">01 — INTERACTIVE 3D GEOSPATIAL STAGE</div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Explore Micro-Watershed 001 in 3D
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
                Click structure pins on the 3D terrain canvas to inspect evidence data, switch spectral layers, or select camera views.
              </p>
            </div>

            {/* Multispectral Layer Switcher */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto">
              {[
                { id: 'satellite', label: 'Satellite RGB' },
                { id: 'ndvi', label: 'NDVI' },
                { id: 'ndwi', label: 'NDWI' },
                { id: 'lulc', label: 'LULC' },
                { id: 'change', label: 'Delta' },
              ].map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeLayer === layer.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  {layer.label}
                </button>
              ))}
            </div>
          </ScrollReveal>

          {/* 3D Canvas Container */}
          <ScrollReveal className="h-[380px] sm:h-[480px] lg:h-[580px] rounded-3xl overflow-hidden border border-slate-200 shadow-xl relative">
            <CinematicTerrain3D
              activeLayer={activeLayer}
              cameraMode={cameraMode}
              onCameraModeChange={setCameraMode}
              hoveredMarker={hoveredMarker}
              setHoveredMarker={setHoveredMarker}
              scrollProgress={scrollProgress}
            />
          </ScrollReveal>
        </div>
      </section>

      {/* ------------------- PAGE 3: PLATFORM CAPABILITIES BENTO GRID ------------------- */}
      <section id="bento" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 bg-slate-50">
        <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
          <ScrollReveal className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="text-xs font-mono font-bold text-sky-700 tracking-wider">02 — PLATFORM CAPABILITIES</div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight uppercase">
              Engineered for Auditability.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-teal-600">
                Built for Field Officers.
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Four unified modules bridging satellite observation with ground evidence.
            </p>
          </ScrollReveal>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
            {/* Tile 1: 30m Satellite Spectral Analysis */}
            <ScrollReveal className="md:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
              <div className="space-y-3 sm:space-y-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Satellite size={22} />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Multi-Epoch Satellite Band Math</h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                  Direct computation of NDVI, NDWI, NDBI, and SAVI index matrices across 6 acquisition epochs. Track vegetation vigor recovery and surface water expansion down to individual 30m pixels.
                </p>
                <div className="pt-2 sm:pt-4 flex flex-wrap gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-mono">
                  <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-full font-bold">NDVI &gt; 0.30 Vegetated</span>
                  <span className="bg-sky-50 border border-sky-200 text-sky-800 px-2.5 py-1 rounded-full font-bold">NDWI &gt; 0.10 Surface Water</span>
                  <span className="bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-full font-bold">SAVI Calibrated</span>
                </div>
              </div>
            </ScrollReveal>

            {/* Tile 2: DRISHTI Photo Binding */}
            <ScrollReveal className="md:col-span-4 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
              <div className="space-y-3 sm:space-y-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
                  <Camera size={22} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">DRISHTI Photo Binding</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Automatic binding of field photographs to nearest structure centroids via geodesic Haversine distance and EXIF timestamp validation.
                </p>
                <div className="font-mono text-[10px] sm:text-[11px] text-sky-800 bg-sky-50 border border-sky-200 p-2.5 sm:p-3 rounded-2xl font-bold">
                  Proximity: 38m (Valid &lt;50m)
                </div>
              </div>
            </ScrollReveal>

            {/* Tile 3: 250m Buffer Catchments */}
            <ScrollReveal className="md:col-span-4 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
              <div className="space-y-3 sm:space-y-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Target size={22} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">250m Buffer Assessment</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Inundation-aware zonal statistics isolating true land vegetation gain from flooded reservoir areas around structure centroids.
                </p>
                <div className="font-mono text-[10px] sm:text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-2.5 sm:p-3 rounded-2xl font-bold">
                  Score: 78.4 / 100 Composite
                </div>
              </div>
            </ScrollReveal>

            {/* Tile 4: Signed Evidence PDF Generation */}
            <ScrollReveal className="md:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
              <div className="space-y-3 sm:space-y-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <FileCheck2 size={22} />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Automated Signed Evidence Packs</h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                  Generate audit-ready ReportLab PDF evidence packages with embedded before/after spectral maps, DRISHTI photo EXIF verifications, and financial cost-effectiveness metrics (₹/ha).
                </p>
                <div className="pt-1 sm:pt-2 flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-mono text-emerald-700 font-bold">
                  <CheckCircle2 size={16} />
                  <span>ReportLab Platypus Engine • Matplotlib Figures</span>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ------------------- PAGE 4: MULTI-TEMPORAL BEFORE & AFTER COMPARISON ------------------- */}
      <section id="temporal" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 bg-white border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          <ScrollReveal className="space-y-2 sm:space-y-3">
            <div className="text-xs font-mono font-bold text-amber-700 tracking-wider">03 — MULTI-TEMPORAL PROOF</div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Compare 2024 Baseline vs 2026 Outcome
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
              Drag the interactive slider below to compare spectral index recovery around Check Dam #024.
            </p>
          </ScrollReveal>

          <ScrollReveal>
            <BeforeAfterSlider />
          </ScrollReveal>
        </div>
      </section>

      {/* ------------------- PAGE 5: AUDITABILITY & METHODOLOGY ------------------- */}
      <section id="auditability" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
          <ScrollReveal className="max-w-3xl space-y-2 sm:space-y-3">
            <div className="text-xs font-mono font-bold text-emerald-700 tracking-wider">04 — DETERMINISTIC AUDITABILITY</div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              100% Auditable & Verifiable Formulas.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Every score, area calculation, and decision output is re-derivable from published constants beside it. Built with pure NumPy geospatial operations, removing GDAL deployment overhead.
            </p>
          </ScrollReveal>

          <ScrollReveal className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 font-mono text-xs">
            <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-3xl space-y-2 shadow-xs">
              <div className="text-emerald-700 font-bold text-xs sm:text-sm">Vegetation Response (0-40)</div>
              <p className="text-slate-600 font-sans text-xs">
                Derived directly from land-only ΔNDVI within the 250m geodesic buffer, excluding flooded pixels.
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-3xl space-y-2 shadow-xs">
              <div className="text-sky-700 font-bold text-xs sm:text-sm">Water Surface Gain (0-40)</div>
              <p className="text-slate-600 font-sans text-xs">
                Computed from NDWI &gt; 0.10 threshold expansion percentage relative to pre-construction baseline.
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-3xl space-y-2 shadow-xs">
              <div className="text-amber-700 font-bold text-xs sm:text-sm">Spatial Improvement (0-20)</div>
              <p className="text-slate-600 font-sans text-xs">
                Percentage share of buffer pixels showing statistically significant positive spectral delta.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ------------------- PAGE 6: CLOSING CTA & FOOTER ------------------- */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 bg-white text-center border-t border-slate-200/80">
        <ScrollReveal className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-mono text-emerald-800 font-bold shadow-xs">
            <Sparkles size={14} className="text-emerald-600 shrink-0" />
            <span>OPERATIONAL READY FOR DISTRICT TEAMS</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 uppercase tracking-tight leading-tight">
            Ready to Explore Watershed Intelligence?
          </h2>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-4">
            <button
              onClick={onExploreClick}
              className="flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm px-7 sm:px-9 py-3.5 sm:py-4 rounded-full transition-all shadow-xl shadow-emerald-600/25 cursor-pointer hover:scale-105"
            >
              <span>Launch Operational Web-GIS</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={onLoginClick}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold text-xs sm:text-sm px-6 sm:px-8 py-3.5 sm:py-4 rounded-full transition-all cursor-pointer"
            >
              <User size={15} />
              <span>Officer Portal</span>
            </button>
          </div>

          <footer className="pt-12 sm:pt-16 border-t border-slate-200/80 text-[11px] sm:text-xs font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-center sm:text-left">
            <div>© 2026 Watershed Insight • All Rights Reserved</div>
            <div>Department of Land Resources (DoLR) • Ministry of Rural Development</div>
          </footer>
        </ScrollReveal>
      </section>
    </div>
  )
}
