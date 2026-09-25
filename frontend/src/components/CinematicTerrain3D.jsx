import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Camera, Compass, Layers, Maximize2, Move3d, RotateCw, Sparkles, Target, Zap } from 'lucide-react'

/**
 * CinematicTerrain3D — Responsive Light/White Theme 3D Visualizer.
 * Supports dynamic FOV aspect-ratio scaling for mobile & desktop viewports,
 * hardware anti-aliasing, offscreen intersection observer, and smooth cursor parallax.
 */
export default function CinematicTerrain3D({
  activeLayer = 'satellite',
  onMarkerClick,
  hoveredMarker,
  setHoveredMarker,
  scrollProgress = 0,
  cameraMode = 'overview', // 'overview' | 'structure' | 'river' | 'orbit'
  onCameraModeChange,
}) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const terrainMeshRef = useRef(null)
  const sunLightRef = useRef(null)
  const markersGroupRef = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })
  const scrollProgressRef = useRef(scrollProgress)
  const isVisibleRef = useRef(true)
  const [webglSupported, setWebglSupported] = useState(true)
  const [selectedPin, setSelectedPin] = useState(null)
  const [activeCamPreset, setActiveCamPreset] = useState(cameraMode)

  useEffect(() => {
    scrollProgressRef.current = scrollProgress
  }, [scrollProgress])

  useEffect(() => {
    setActiveCamPreset(cameraMode)
  }, [cameraMode])

  // 3D Intervention & Evidence Hotspot Nodes
  const MARKERS = [
    { id: 'INT-024', name: 'Check Dam #024', type: 'Check Dam', x: -4, z: 2, y: 1.2, status: 'Active Monitoring', evidence: 12, impact: '+0.21 NDVI', cost: '₹ 3.2 Lakh' },
    { id: 'INT-018', name: 'Farm Pond FP-02', type: 'Farm Pond', x: 2.5, z: -3, y: 0.8, status: 'Verified', evidence: 8, impact: '+1.9 ha Water', cost: '₹ 2.4 Lakh' },
    { id: 'INT-031', name: 'Contour Trench CT-09', type: 'Contour Trench', x: 6, z: 4, y: 2.1, status: 'Verified', evidence: 5, impact: '+0.14 SAVI', cost: '₹ 1.8 Lakh' },
    { id: 'INT-005', name: 'Afforestation Block A1', type: 'Afforestation', x: -7, z: -5, y: 2.8, status: 'High Growth', evidence: 16, impact: '+0.35 Canopy', cost: '₹ 4.5 Lakh' },
    { id: 'PHOTO-102', name: 'DRISHTI Field Inspection', type: 'Field Photo', x: -2, z: 1.2, y: 1.4, status: 'EXIF Valid (38m)', evidence: 1, impact: 'Proximity Valid', cost: 'Field Audit' },
  ]

  useEffect(() => {
    if (!containerRef.current) return

    // 1. WebGL Support Verification
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (!gl) {
        setWebglSupported(false)
        return
      }
    } catch {
      setWebglSupported(false)
      return
    }

    const container = containerRef.current
    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || 450
    const aspect = width / height

    // 2. Intersection Observer (Pauses rendering when offscreen for 100% performance)
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting
      },
      { threshold: 0.02 }
    )
    observer.observe(container)

    // 3. Scene Setup with Bright Light/White Atmosphere
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0xf8fafc, 0.003)
    sceneRef.current = scene

    // 4. Camera Setup — Mobile/Desktop Responsive FOV
    const fov = aspect < 1 ? 55 : 40 // Wider FOV on mobile phone viewports
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000)
    camera.position.set(0, 15, 22)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // 5. Renderer Setup with High Performance & Anti-Aliasing
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // 6. Bright Outdoor Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0)
    scene.add(ambientLight)

    const hemiLight = new THREE.HemisphereLight(0x0ea5e9, 0x10b981, 1.4)
    scene.add(hemiLight)

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.6)
    sunLight.position.set(18, 32, 18)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 512
    sunLight.shadow.mapSize.height = 512
    scene.add(sunLight)
    sunLightRef.current = sunLight

    const rimLight = new THREE.DirectionalLight(0x10b981, 1.2)
    rimLight.position.set(-18, 22, -18)
    scene.add(rimLight)

    // 7. Light Particle Atmosphere
    const particleCount = 150
    const particleGeo = new THREE.BufferGeometry()
    const particlePositions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 45
      particlePositions[i + 1] = Math.random() * 15 - 2
      particlePositions[i + 2] = (Math.random() - 0.5) * 45
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    const particleMat = new THREE.PointsMaterial({
      size: 0.22,
      color: 0x059669,
      transparent: true,
      opacity: 0.35,
    })
    const particlePoints = new THREE.Points(particleGeo, particleMat)
    scene.add(particlePoints)

    // 8. Base Holographic Ring
    const ringGeo = new THREE.RingGeometry(15, 15.3, 64)
    ringGeo.rotateX(-Math.PI / 2)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
    })
    const ringMesh = new THREE.Mesh(ringGeo, ringMat)
    ringMesh.position.y = -0.5
    scene.add(ringMesh)

    // 9. Heightmap Terrain Mesh (64x64 Grid)
    const geometry = new THREE.PlaneGeometry(32, 32, 64, 64)
    geometry.rotateX(-Math.PI / 2)

    const pos = geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)

      const distFromCenter = Math.sqrt(x * x + z * z)
      const mainRidge = Math.sin(x * 0.22) * Math.cos(z * 0.22) * 3.8
      const detail1 = Math.sin(x * 0.45 + z * 0.35) * 1.0
      const detail2 = Math.cos(x * 0.85 - z * 0.65) * 0.4
      const valley = Math.exp(-Math.pow(x - z * 0.3, 2) / 16) * -2.8

      let y = mainRidge + detail1 + detail2 + valley
      if (distFromCenter > 13) {
        y *= Math.max(0, 1 - (distFromCenter - 13) / 3)
      }

      pos.setY(i, y)
    }
    geometry.computeVertexNormals()

    // Canvas Texture Fallback & Satellite Map
    const fallbackCanvas = document.createElement('canvas')
    fallbackCanvas.width = 256
    fallbackCanvas.height = 256
    const ctx = fallbackCanvas.getContext('2d')
    const grad = ctx.createLinearGradient(0, 0, 256, 256)
    grad.addColorStop(0, '#059669')
    grad.addColorStop(0.4, '#10b981')
    grad.addColorStop(0.8, '#34d399')
    grad.addColorStop(1, '#e2e8f0')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 256, 256)

    const fallbackTexture = new THREE.CanvasTexture(fallbackCanvas)

    let materialColor = 0xffffff
    if (activeLayer === 'ndvi') materialColor = 0xd1fae5
    else if (activeLayer === 'ndwi') materialColor = 0xe0f2fe
    else if (activeLayer === 'lulc') materialColor = 0xf3e8ff
    else if (activeLayer === 'change') materialColor = 0xffe4e6

    const material = new THREE.MeshStandardMaterial({
      map: fallbackTexture,
      color: materialColor,
      roughness: 0.35,
      metalness: 0.1,
      flatShading: false,
    })

    new THREE.TextureLoader().load('/watershed_hero_bg.jpg', (tex) => {
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.RepeatWrapping
      material.map = tex
      material.needsUpdate = true
    })

    const terrainMesh = new THREE.Mesh(geometry, material)
    terrainMesh.receiveShadow = true
    terrainMesh.castShadow = true
    scene.add(terrainMesh)
    terrainMeshRef.current = terrainMesh

    // Wireframe Grid Overlay
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    })
    const wireframeMesh = new THREE.Mesh(geometry, wireframeMat)
    wireframeMesh.position.y += 0.05
    scene.add(wireframeMesh)

    // 10. Watershed Boundary Vector Line
    const boundaryPoints = []
    const numPoints = 48
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2
      const r = 13 + Math.sin(angle * 3) * 2 + Math.cos(angle * 5) * 1.5
      const bx = Math.cos(angle) * r
      const bz = Math.sin(angle) * r
      const by = Math.sin(bx * 0.18) * Math.cos(bz * 0.18) * 2.5 + 0.3
      boundaryPoints.push(new THREE.Vector3(bx, by, bz))
    }
    const boundaryGeo = new THREE.BufferGeometry().setFromPoints(boundaryPoints)
    const boundaryMat = new THREE.LineBasicMaterial({ color: 0x059669, linewidth: 2 })
    const boundaryLine = new THREE.Line(boundaryGeo, boundaryMat)
    scene.add(boundaryLine)

    // 11. Stream River Network
    const streamPoints = [
      new THREE.Vector3(-14, 0.8, -10),
      new THREE.Vector3(-8, 0.6, -5),
      new THREE.Vector3(-2, 0.2, 0),
      new THREE.Vector3(4, -0.4, 4),
      new THREE.Vector3(10, -0.8, 8),
      new THREE.Vector3(14, -1.2, 12),
    ]
    const streamCurve = new THREE.CatmullRomCurve3(streamPoints)
    const streamGeo = new THREE.TubeGeometry(streamCurve, 32, 0.22, 6, false)
    const streamMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.9 })
    const streamMesh = new THREE.Mesh(streamGeo, streamMat)
    scene.add(streamMesh)

    // 12. 3D Marker Pin Group
    const markersGroup = new THREE.Group()
    MARKERS.forEach((m) => {
      const pinGroup = new THREE.Group()
      pinGroup.position.set(m.x, m.y + 0.8, m.z)

      const color = m.type === 'Field Photo' ? 0xe11d48 : m.type === 'Check Dam' ? 0xd97706 : 0x059669
      const headGeo = new THREE.SphereGeometry(0.42, 14, 14)
      const headMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      })
      const headMesh = new THREE.Mesh(headGeo, headMat)
      pinGroup.add(headMesh)

      const stemGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6)
      const stemMat = new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.8 })
      const stemMesh = new THREE.Mesh(stemGeo, stemMat)
      stemMesh.position.y = -0.6
      pinGroup.add(stemMesh)

      pinGroup.userData = m
      markersGroup.add(pinGroup)
    })
    scene.add(markersGroup)
    markersGroupRef.current = markersGroup

    // 13. Mouse / Touch Pointer Listener
    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect()
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      const x = ((clientX - rect.left) / rect.width) * 2 - 1
      const y = -((clientY - rect.top) / rect.height) * 2 + 1
      mouseRef.current.targetX = x * 0.45
      mouseRef.current.targetY = y * 0.35
    }
    window.addEventListener('mousemove', handlePointerMove, { passive: true })
    window.addEventListener('touchmove', handlePointerMove, { passive: true })

    // 14. Raycaster Pin Selection
    const raycaster = new THREE.Raycaster()
    const mousePos = new THREE.Vector2()

    const handleCanvasClick = (e) => {
      const rect = container.getBoundingClientRect()
      const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX
      const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY
      mousePos.x = ((clientX - rect.left) / rect.width) * 2 - 1
      mousePos.y = -((clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mousePos, camera)
      if (markersGroupRef.current) {
        const intersects = raycaster.intersectObjects(markersGroupRef.current.children, true)
        if (intersects.length > 0) {
          let obj = intersects[0].object
          while (obj && !obj.userData?.id && obj.parent) {
            obj = obj.parent
          }
          if (obj && obj.userData?.id) {
            setSelectedPin(obj.userData)
            if (setHoveredMarker) setHoveredMarker(obj.userData)
            if (onMarkerClick) onMarkerClick(obj.userData)
          }
        }
      }
    }
    container.addEventListener('click', handleCanvasClick)

    // 15. Animation Loop
    let animationFrameId
    let clock = new THREE.Clock()

    const targetCamPos = new THREE.Vector3(0, 15, 22)
    const targetLookAt = new THREE.Vector3(0, 0, 0)

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)

      if (!isVisibleRef.current) return

      const elapsed = clock.getElapsedTime()
      const sp = scrollProgressRef.current

      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06

      if (sunLightRef.current) {
        sunLightRef.current.position.x = 18 + mouseRef.current.x * 12
        sunLightRef.current.position.z = 18 + mouseRef.current.y * 12
      }

      particlePoints.rotation.y = elapsed * 0.02

      if (activeCamPreset === 'structure') {
        targetCamPos.set(-4 + Math.sin(elapsed * 0.3) * 3, 5, 2 + Math.cos(elapsed * 0.3) * 5)
        targetLookAt.set(-4, 1.2, 2)
      } else if (activeCamPreset === 'river') {
        targetCamPos.set(-2, 3, 10 + Math.sin(elapsed * 0.2) * 2)
        targetLookAt.set(4, -0.4, 4)
      } else if (activeCamPreset === 'orbit') {
        const orbitRadius = 22
        targetCamPos.set(
          Math.sin(elapsed * 0.35) * orbitRadius,
          10 + Math.cos(elapsed * 0.25) * 3,
          Math.cos(elapsed * 0.35) * orbitRadius
        )
        targetLookAt.set(0, 0, 0)
      } else {
        targetCamPos.set(
          mouseRef.current.x * 5 + Math.sin(sp * Math.PI) * 2,
          15 - sp * 4 + mouseRef.current.y * 3,
          22 - sp * 6
        )
        targetLookAt.set(0, 0, 0)
      }

      camera.position.lerp(targetCamPos, 0.04)
      camera.lookAt(targetLookAt)

      if (terrainMeshRef.current && activeCamPreset !== 'structure') {
        const rotY = Math.sin(elapsed * 0.12) * 0.06
        terrainMeshRef.current.rotation.y = rotY
        wireframeMesh.rotation.y = rotY
        boundaryLine.rotation.y = rotY
        streamMesh.rotation.y = rotY
        markersGroup.rotation.y = rotY
        ringMesh.rotation.z = elapsed * 0.05
      }

      if (markersGroupRef.current) {
        markersGroupRef.current.children.forEach((child, idx) => {
          child.position.y = MARKERS[idx].y + 0.8 + Math.sin(elapsed * 2.2 + idx) * 0.14
        })
      }

      renderer.render(scene, camera)
    }
    animate()

    // 16. Dynamic Resize Handler (Mobile & Desktop Responsive Aspect & FOV)
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      const currentAspect = w / h
      cameraRef.current.aspect = currentAspect
      cameraRef.current.fov = currentAspect < 1 ? 55 : 40
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(w, h)
    }
    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      cancelAnimationFrame(animationFrameId)
      observer.disconnect()
      container.removeEventListener('click', handleCanvasClick)
      window.removeEventListener('mousemove', handlePointerMove)
      window.removeEventListener('touchmove', handlePointerMove)
      window.removeEventListener('resize', handleResize)
      if (rendererRef.current && rendererRef.current.domElement && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement)
      }
      geometry.dispose()
      if (material.map) material.map.dispose()
      material.dispose()
      wireframeMat.dispose()
      boundaryGeo.dispose()
      boundaryMat.dispose()
      streamGeo.dispose()
      streamMat.dispose()
      particleGeo.dispose()
      particleMat.dispose()
      ringGeo.dispose()
      ringMat.dispose()
      renderer.dispose()
    }
  }, [activeLayer, activeCamPreset]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeMarker = hoveredMarker || selectedPin

  return (
    <div
      className="relative w-full h-full min-h-[360px] sm:min-h-[480px] lg:min-h-[580px] overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-50 bg-cover bg-center shadow-lg group"
      style={{ backgroundImage: `url('/watershed_hero_bg.jpg')` }}
    >
      <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px]" />

      {/* 3D WebGL Canvas Viewport */}
      {webglSupported ? (
        <div ref={containerRef} className="relative z-10 w-full h-full cursor-grab active:cursor-grabbing" />
      ) : (
        <div
          className="w-full h-full bg-cover bg-center flex items-center justify-center relative"
          style={{ backgroundImage: `url('/watershed_hero_bg.jpg')` }}
        >
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs" />
          <div className="relative z-10 text-center space-y-2 p-6">
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              2D High-Resolution Terrain Mode Active
            </span>
            <h4 className="text-sm font-bold text-slate-900">Pune Micro-Watershed 001</h4>
            <p className="text-xs text-slate-500">WebGL hardware acceleration disabled or unavailable on device.</p>
          </div>
        </div>
      )}

      {/* Clean White Floating 3D Controls Dock (Top Center) */}
      <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 sm:gap-1.5 bg-white/90 backdrop-blur-md border border-slate-200 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full shadow-md max-w-[95%] overflow-x-auto">
        {[
          { id: 'overview', label: '3D Overview', icon: Compass },
          { id: 'structure', label: 'Structure Focus', icon: Target },
          { id: 'river', label: 'Drainage Valley', icon: Sparkles },
          { id: 'orbit', label: '360° Orbit', icon: RotateCw },
        ].map((btn) => {
          const Icon = btn.icon
          const isActive = activeCamPreset === btn.id
          return (
            <button
              key={btn.id}
              onClick={() => {
                setActiveCamPreset(btn.id)
                if (onCameraModeChange) onCameraModeChange(btn.id)
              }}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon size={12} />
              <span>{btn.label}</span>
            </button>
          )
        })}
      </div>

      {/* Structure Inspection Popup */}
      {activeMarker && (
        <div className="absolute top-14 sm:top-16 left-4 sm:left-6 z-30 bg-white/95 border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xl backdrop-blur-md max-w-[260px] sm:max-w-xs text-xs space-y-2 font-sans animate-in fade-in">
          <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-100 pb-2">
            <span className="text-emerald-700 text-xs sm:text-sm">{activeMarker.name}</span>
            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
              {activeMarker.id}
            </span>
          </div>
          <div className="text-[11px] text-slate-600 flex items-center justify-between">
            <span className="text-slate-500">Type:</span>
            <span className="font-semibold text-slate-800">{activeMarker.type}</span>
          </div>
          <div className="text-[11px] text-slate-600 flex items-center justify-between">
            <span className="text-slate-500">Status:</span>
            <span className="text-sky-700 font-semibold">{activeMarker.status}</span>
          </div>
          <div className="text-[11px] text-slate-600 flex items-center justify-between">
            <span className="text-slate-500">Cost:</span>
            <span className="text-amber-700 font-semibold">{activeMarker.cost || '₹ 3.2 Lakh'}</span>
          </div>
          <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-100">
            <span className="text-slate-500">Impact Signal:</span>
            <span className="text-emerald-700 font-mono font-bold">{activeMarker.impact}</span>
          </div>
        </div>
      )}
    </div>
  )
}
