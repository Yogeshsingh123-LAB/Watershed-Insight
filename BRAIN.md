# BRAIN.md — WATERSHED INSIGHT System Intelligence & Architecture Master Document

**Platform Name**: WATERSHED INSIGHT  
**Target Organization**: Department of Land Resources (DoLR), Ministry of Rural Development, Government of India  
**Problem Statement ID**: 26015  
**Core Purpose**: National Geospatial Watershed Monitoring, Geo-Coded Evidence Intelligence & Decision Support Platform  

---

## 🏛️ 1. Executive System Overview

`BRAIN.md` documents the internal reasoning, architectural mechanics, scientific algorithms, and operational workflows of **WATERSHED INSIGHT**. The platform bridges the critical gap between field-level geo-tagged ground photographs (**DRISHTI**) and 30 m spatial resolution multispectral satellite data (**SRISHTI**), transforming manual documentation into an audit-ready, evidence-based decision-support system.

---

## 🧠 2. Core Architectural Components

```
+-----------------------------------------------------------------------------------+
|                                  FRONTEND LAYER                                   |
|   React (Vite) + Leaflet GIS + Tailwind CSS + Lucide Icons + UI/UX Pro Max Rules   |
|   - Public Front Door Landing Page (/) & Dedicated Officer Login Screen (/login)     |
|   - 4 Role-Based Security Portals: Super Admin, Officer, Verification, Auditor   |
|   - 9 Core Navigation Sections in Operational Officer Portal                     |
+----------------------------------------+------------------------------------------+
                                         | REST API (JSON / GeoJSON / Streaming)
+----------------------------------------v------------------------------------------+
|                                  BACKEND LAYER                                    |
|   FastAPI + Uvicorn + Pydantic v2 + SQLite / DataStore + ReportLab PDF Engine    |
|   - Decision & Reasoning Engine (Officer Action Queue + Evidentiary "WHY")        |
|   - Data Sources Integrator (SRISHTI 30m Satellite + DRISHTI Mobile Sync)         |
|   - Lifecycle Manager (7 Intervention States + Status Change Auditor)            |
|   - Evidence-Bounded AI Explainer ("Ask Watershed Insight")                       |
+----------------------------------------+------------------------------------------+
                                         | Raster & Vector Data Pipeline
+----------------------------------------v------------------------------------------+
|                             GEOSPATIAL ENGINE LAYER                               |
|   NumPy + SciPy + Pillow + Pyproj + Shapely (Pure Python Stack, Zero License Fees)|
|   - Spectral Indices (NDVI, NDWI, NDBI, SAVI)                                     |
|   - LULC Transition Matrix & Change Hotspot Allocator                            |
|   - D8 Hydrology (Sink Filling, Flow Accumulation, Stream Order, Catchments)      |
|   - 200-Point Difference-in-Differences (DiD) Background Control Calibration      |
+-----------------------------------------------------------------------------------+
```

### 2.1 End-to-End Data Ecosystem Flowchart

```
                    ┌──────────────────────────────┐
                    │      DATA ECOSYSTEM          │
                    │                              │
                    │  SRISHTI-DRISHTI             │
                    │  Geo-Coded Field Images      │
                    │  DEM / GIS Data              │
                    │  Watershed & Intervention DB │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │     DATA INGESTION LAYER      │
                    │                              │
                    │  Import • Georeference      │
                    │  Metadata • Standardization  │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │   DATA QUALITY & VALIDATION   │
                    │                              │
                    │ GPS • Timestamp • Resolution │
                    │ Cloud • Duplicates • Quality │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
              ┌────────────────────┴────────────────────┐
              │                                         │
              ▼                                         ▼
┌─────────────────────────────┐          ┌─────────────────────────────┐
│   SATELLITE ANALYTICS       │          │   FIELD PHOTO INTELLIGENCE │
│                             │          │                             │
│ NDVI • NDWI • SAVI • NDBI   │          │ GPS / EXIF                  │
│ LULC • Change Detection     │          │ Image Quality               │
│ Time-Series Analysis        │          │ Vegetation / Water Signals  │
└──────────────┬──────────────┘          └──────────────┬──────────────┘
               │                                        │
               └────────────────┬───────────────────────┘
                                ▼
                    ┌──────────────────────────────┐
                    │   GEOSPATIAL FUSION ENGINE   │
                    │                              │
                    │ Satellite + Photo + DEM      │
                    │ Intervention + Location     │
                    │ Catchment + Time             │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │   WATERSHED ANALYTICS        │
                    │                              │
                    │ Terrain • Drainage           │
                    │ Catchment • Morphometry      │
                    │ Intervention Context         │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │   BEFORE / AFTER ANALYSIS    │
                    │                              │
                    │ Baseline → Intervention     │
                    │ Intervention → Monitoring    │
                    │ Change Detection             │
                    │ Control Comparison           │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │    IMPACT ASSESSMENT         │
                    │                              │
                    │ Vegetation Change            │
                    │ Surface-Water Change         │
                    │ Land-Cover Change            │
                    │ Spatial Extent               │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
              ┌────────────────────┴────────────────────┐
              │                                         │
              ▼                                         ▼
┌─────────────────────────────┐          ┌─────────────────────────────┐
│   EVIDENCE HEALTH           │          │   CONFIDENCE ENGINE         │
│                             │          │                             │
│ Evidence Completeness       │          │ Data Quality                │
│ GPS Validity                │          │ Temporal Coverage           │
│ Photo Validity              │          │ Satellite Quality           │
│ Temporal Consistency        │          │ Evidence Consistency        │
└──────────────┬──────────────┘          └──────────────┬──────────────┘
               │                                        │
               └────────────────┬───────────────────────┘
                                ▼
                    ┌──────────────────────────────┐
                    │   DECISION SUPPORT ENGINE    │
                    │                              │
                    │ Evidence-Based Findings      │
                    │ AI-Assisted Explanation      │
                    │ Monitoring Recommendations   │
                    │ Field Verification Triggers  │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │       DECISION CENTER        │
                    │                              │
                    │ Review Evidence              │
                    │ Review Impact                │
                    │ Review Confidence            │
                    │ Field Verification           │
                    │ Officer Decision              │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │     REPORT & AUDIT LAYER      │
                    │                              │
                    │ Maps • Charts • Photos       │
                    │ Findings • Evidence          │
                    │ Decision • Audit Trail        │
                    │ Exportable Evidence Report   │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │    CONTINUOUS MONITORING      │
                    │                              │
                    │ New Satellite Data            │
                    │ New Field Evidence            │
                    │ Re-analysis → Re-assessment   │
                    └──────────────┬───────────────┘
                                   │
                                   └──────────► (DATA ECOSYSTEM RE-FEED)
```

### 2.2 Operational User Interaction Sequence

```
LOGIN (RBAC Authorization)
  ↓
DASHBOARD (High-level monitoring status & telemetry)
  ↓
SELECT WATERSHED (State > District > Block > Micro-watershed cascade)
  ↓
EXPLORE MAP (GIS map-first interface + layer control)
  ↓
SELECT INTERVENTION (Filter by type, status, or spatial location)
  ↓
VIEW EVIDENCE (6-Factor Checklist + Ground Photo EXIF GPS)
  ↓
ANALYZE BEFORE vs AFTER (Dual slider split screen + spectral deltas)
  ↓
VIEW IMPACT + CONFIDENCE (40/40/20 Impact Score + 200-sample DiD control)
  ↓
UNDERSTAND "WHY?" (Explicit evidentiary justification matrix + AI Explainer)
  ↓
REVIEW RECOMMENDATION (Officer Action Queue: Approve, Reject, Re-inspect)
  ↓
FIELD VERIFICATION / MONITOR (Trigger mobile inspection task)
  ↓
OFFICER DECISION (Update lifecycle status + log decision)
  ↓
GENERATE EVIDENCE REPORT (10-Page signed PDF executive dossier)
  ↓
AUDIT TRAIL (Immutable SHA-256 action log)
  ↓
CONTINUOUS MONITORING (Satellite re-pass & DRISHTI photo re-sync loop)
```

### 2.3 9-Item Website Navigation Structure

The platform navigation bar and workspace layout are organized into **9 core operational sections**:

1. **Dashboard** — Overall watershed monitoring status, telemetry, metrics cards, structure counts.
2. **Watershed Explorer** — Map-first GIS interface with satellite layers, DEM, elevation, stream network, and hillshade.
3. **Interventions** — All watershed structures, status filters, impact ranking, and 7-stage lifecycle states.
4. **Change Analysis** — Before/after satellite imagery comparison, NDVI/NDWI deltas, and LULC transition matrices.
5. **Field Evidence** — Geo-coded ground photos, EXIF GPS validation, centroid distance checks ($\le 50\text{m}$), and photo upload.
6. **Impact Assessment** — Environmental change metrics, 40/40/20 impact score calculation, and 200-sample point DiD background calibration.
7. **Decision Center** — Officer review queue, evidence-based recommendations, AI assistant explanation, and officer action triggers.
8. **Reports** — Evidence-based 10-page signed PDF executive dossier generator.
9. **Audit Trail** — Immutable system log ledger tracking who viewed, verified, changed, or decided what.

---

## 🔬 3. Scientific Methodology & Mathematical Foundations

### 3.1 Spectral Indices Engine
- **NDVI (Normalized Difference Vegetation Index)**:
  $$\text{NDVI} = \frac{\text{NIR} - \text{Red}}{\text{NIR} + \text{Red}} = \frac{B8 - B4}{B8 + B4}$$
- **NDWI (Normalized Difference Water Index)**:
  $$\text{NDWI} = \frac{\text{Green} - \text{NIR}}{\text{Green} + \text{NIR}} = \frac{B3 - B8}{B3 + B8}$$
- **SAVI (Soil-Adjusted Vegetation Index, $L=0.5$)**:
  $$\text{SAVI} = \frac{(B8 - B4) \times 1.5}{B8 + B4 + 0.5}$$
- **NDBI (Normalized Difference Built-up Index)**:
  $$\text{NDBI} = \frac{\text{SWIR} - \text{NIR}}{\text{SWIR} + \text{NIR}} = \frac{B11 - B8}{B11 + B8}$$

### 3.2 Impact Score Formula (40 / 40 / 20 Weighting)
$$\text{Impact Score} = 0.40 \times S_{\Delta\text{NDVI}} + 0.40 \times S_{\Delta\text{Water}} + 0.20 \times S_{\text{LULC}}$$

1. **Vegetation Score** ($S_{\Delta\text{NDVI}}$): Mean vegetation index change inside buffer radius ($R = 250\text{m}$).
2. **Water Score** ($S_{\Delta\text{Water}}$): Net expansion of surface water area ($\text{ha}$).
3. **LULC Stability Score** ($S_{\text{LULC}}$): Conservation of agricultural area and reduction of degraded land.

### 3.3 Difference-in-Differences (DiD) Background Calibration
To prevent climatic anomalies (e.g. wet monsoon year) from inflating structure impact scores, the engine samples **200 non-intervention control points** across the watershed:

$$\text{DiD} = \left(\text{NDVI}_{\text{impact, T1}} - \text{NDVI}_{\text{impact, T0}}\right) - \left(\text{NDVI}_{\text{control, T1}} - \text{NDVI}_{\text{control, T0}}\right)$$

### 3.4 6-Factor Evidence Health Checklist
Every structure is evaluated against 6 mandatory criteria:
1. **Pre-Construction Satellite Baseline** ($T_0$ Sentinel-2 / Landsat-8)
2. **Pre-Construction Ground Geotagged Photo** ($T_0$ DRISHTI photo)
3. **Post-Construction Satellite Imagery** ($T_1$ Sentinel-2 / Landsat-8)
4. **Post-Construction Ground Geotagged Photo** ($T_1$ DRISHTI photo)
5. **Spatial Proximity Check** ($\le 50\text{ m}$ distance between ground photo GPS & structure centroid)
6. **Temporal Alignment Window** ($\le 30\text{ days}$ gap between satellite pass & ground photo)

---

## 🛡️ 4. Government Workflows, RBAC & Audit Trail

### 4.1 7-Stage Intervention Lifecycle
```
[ PLANNED ] ──> [ SANCTIONED ] ──> [ UNDER_CONSTRUCTION ] ──> [ COMPLETED ]
                                                                     │
                                                 ┌───────────────────┴───────────────────┐
                                                 ▼                                       ▼
                                       [ VERIFIED_SATELLITE ]                  [ FLAGGED_ANOMALY ]
                                                 │
                                                 ▼
                                       [ VERIFIED_GROUND ]
```

### 4.2 Government User Roles (RBAC)
- **Super Admin / DoLR Nodal**: Full system access, audit trail review, user role management.
- **State Nodal Officer**: State-wide watershed monitoring, sanction approval, district ranking.
- **District Collector / WDT**: Action queue processing, intervention status updates, field inspection assignment.
- **Field Inspector / Public**: Geotagged ground photo upload, mobile inspection submission, public verification dossier view.

### 4.3 Immutable Audit Log Schema
All critical operations emit an immutable JSON audit log:
```json
{
  "timestamp": "2026-09-23T13:45:00Z",
  "user": "district_officer_01",
  "role": "DISTRICT_OFFICER",
  "action": "STATUS_CHANGE",
  "target_type": "INTERVENTION",
  "target_id": "INT-PT-003",
  "details": {
    "old_status": "COMPLETED",
    "new_status": "VERIFIED_GROUND",
    "reason": "6-Factor Evidence Health verified (Score: 100/100)"
  },
  "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

---

## 📂 5. Repository Directory Mapping

```
SIH016/
├── BRAIN.md                             # [THIS FILE] System Intelligence Master Document
├── README.md                            # Main Project README
├── docs/                                # Technical & Presentation Documentation
│   ├── PROBLEM_STATEMENT_ALIGNMENT.md   # PS 26015 Requirements Mapping
│   ├── SIH_FINAL.md                     # SIH Presentation & Pitch Guide
│   ├── DEMO_SCRIPT.md                   # 5-Minute Live Presentation Script
│   ├── ARCHITECTURE_FINAL.md            # Complete Technical Architecture
│   ├── DATA_SOURCES.md                  # SRISHTI / DRISHTI Data Integration Specs
│   ├── SCIENTIFIC_METHODOLOGY.md        # Formulas & Mathematical Proofs
│   ├── SECURITY.md                      # Security, RBAC & Audit Trail Specs
│   └── TEST_REPORT.md                   # Complete Test Execution Results
├── backend/                             # FastAPI Backend Service
│   ├── app/
│   │   ├── main.py                      # Application Entry Point & Router Registration
│   │   ├── config.py                    # Environment Configuration
│   │   ├── api/                         # REST API Routers
│   │   │   ├── watersheds.py            # Watershed Catalog & Summary Endpoints
│   │   │   ├── interventions.py         # Interventions, Ranking, & Decision Endpoints
│   │   │   ├── data_sources.py          # SRISHTI/DRISHTI Health & Integration
│   │   │   ├── field_inspections.py     # Mobile Photo Upload & Validation
│   │   │   ├── audit.py                 # Immutable Audit Trail Logs
│   │   │   └── ai.py                    # Evidence-Bounded AI Explanation Layer
│   │   ├── geospatial/                  # Pure Python GIS Analytics Engine
│   │   │   ├── processor.py             # Raster Engine (NDVI, NDWI, LULC, Change)
│   │   │   ├── hydrology.py             # D8 Hydrology & Catchment Delineation
│   │   │   ├── photo_interpretation.py  # Geo-Coded Ground Photo Analyzer
│   │   │   └── exif.py                  # EXIF Metadata & Geotag Extractor
│   │   ├── reports/                     # ReportLab 10-Page PDF Generator
│   │   │   └── pdf_generator.py         # Executive Evidence Pack Generator
│   │   └── services/                    # Data Services & Models
│   │       ├── store.py                 # DataStore Catalog & File Persistence
│   │       ├── models.py                # Data Models & Schemas
│   │       ├── audit.py                 # Audit Logger Service
│   │       ├── field_inspections.py     # Field Inspection Service
│   │       └── ai_explainer.py          # Bounded Natural Language Reasoner
├── frontend/                            # React + Vite Web Application
│   ├── src/
│   │   ├── App.jsx                      # Main Container & State Management
│   │   ├── api.js                       # Axios Backend API Client
│   │   ├── index.css                    # Design System & WCAG 2.2 AA Styles
│   │   └── components/                  # UI Components & Panels
│   │       ├── Navbar.jsx               # Header & Administrative Cascade
│   │       ├── Sidebar.jsx              # Map Layer & Filter Control Drawer
│   │       ├── MapView.jsx              # Leaflet GIS Map Component
│   │       ├── DecisionCenterPanel.jsx  # Officer Action Queue & Recommendations
│   │       ├── BeforeAfterPanel.jsx     # Dual-Slider Split Screen Viewer
│   │       ├── EvidenceHealthPanel.jsx  # 6-Factor Checklist & DiD Control Card
│   │       ├── DataSourcesPanel.jsx     # SRISHTI / DRISHTI Data Telemetry
│   │       ├── FieldInspectionPanel.jsx # Mobile Geotagged Photo Upload
│   │       ├── AuditTrailPanel.jsx      # Immutable System Log Ledger
│   │       └── AiAssistantModal.jsx     # Bounded AI Explanation Modal
├── data/                                # Geospatial Data Directory
│   ├── sample/                          # Synthetic & Offline Test Datasets
│   └── real/                            # Real Watershed Satellite Archives & Layers
├── tests/                               # Comprehensive Automated Test Suite
│   ├── test_api.py                      # API Route Unit & Integration Tests
│   ├── test_geospatial.py               # Raster/Hydrology Engine Tests
│   ├── test_calibration.py              # Mathematical Formula & DiD Tests
│   └── test_extended_features.py        # Lifecycle, Audit, AI & Data Sources Tests
└── scripts/
    └── verify_pipeline.py               # 24-Step End-to-End Pipeline Verification Script
```

---

## ⚡ 6. Performance Benchmarks & Test Matrix

| Suite | Scope | Result | Execution Time |
|-------|-------|--------|----------------|
| **Pytest Suite** | 70 Unit & Integration Tests | **70 PASSED / 0 FAILED** | **14.47s** |
| **Pipeline Script** | 24 End-to-End Verification Checks | **24 PASSED / 0 FAILED** | **7.80s** |
| **Vite UI Build** | Production Asset Compilation | **0 ERRORS** | **6.37s** |

---

*WATERSHED INSIGHT — Official Technical Intelligence Document for Problem Statement 26015, Department of Land Resources, Ministry of Rural Development, Government of India.*
