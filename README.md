<div align="center">

# 🛰️ Watershed Insight

**An AI-Assisted Geospatial Decision-Support Platform for Micro-Watershed Monitoring,
Geo-Coded Image Interpretation and Impact Assessment**

[![SIH 2026](https://img.shields.io/badge/SIH-2026-orange?style=for-the-square)](https://www.sih.gov.in/)
[![PS ID](https://img.shields.io/badge/PS-26015-blue?style=for-the-square)](#problem-statement)
[![Ministry](https://img.shields.io/badge/Ministry_of_Rural_Development-DoLR-10b981?style=for-the-square)](#problem-statement)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-square&logo=python&logoColor=white)](#quickstart)
[![FastAPI](https://img.shields.io/badge/FastAPI-1.0-009688?style=for-the-square&logo=fastapi&logoColor=white)](#backend-rest-api)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-square&logo=react&logoColor=black)](#frontend-modules)
[![Tests](https://img.shields.io/badge/tests-49_passing-16a34a?style=for-the-square)](#testing)

*Smart India Hackathon 2026 · Problem Statement **PS26015** ·
Department of Land Resources (DoLR), Ministry of Rural Development*

---

</div>

## 📌 The Problem

> **PS26015 — "Application of Geospatial Techniques for visualization and analysis to
> interpret Geo-Coded Images to enhance watershed Development Outcomes."**

India invests thousands of crores every year in watershed development (IWMP / PMKSY-WDC).
Two rich data streams already exist:

| Stream | What it holds | Status today |
| :--- | :--- | :--- |
| **SRISHTI** (Web-GIS) | Satellite layers, watershed boundaries, intervention inventories | Mapped, but rarely *analysed* |
| **DRISHTI** (field app) | Lakhs of geo-tagged implementation photographs | Collected, but used only as *documentation* |

The result: **data without decisions.** Photographs are filed, not interpreted; satellite
imagery is displayed, not differenced against the structures it is supposed to evaluate.

## 💡 What Watershed Insight Does

Watershed Insight is the **analytical layer that sits on top of SRISHTI and DRISHTI** —
it does not replace them. It closes the loop:

```
   DATA  ─────►  INFORMATION  ─────►  ANALYSIS  ─────►  INTERPRETATION  ─────►  DECISION SUPPORT
 SRISHTI         Spectral indices      250 m buffer        Automated             Signed PDF
 DRISHTI         EXIF + GPS binding    zonal statistics    synthesis             evidence packs
   DEM           LULC / drainage       change detection    impact scoring        prioritisation
```

For **every** IWMP structure the platform answers one auditable question:

> *"Did this ₹ 3.2 lakh check dam actually change the land and water around it — and can I
> prove it with satellite pixels and geo-tagged photographs together?"*

---

## 🧩 The Five Modules

| # | Module | What it delivers | Key techniques |
| :--- | :--- | :--- | :--- |
| **1** | **Watershed Explorer** | State → District → Block → Micro-watershed cascade, 13 toggleable Web-GIS layers, 6 acquisition epochs | Leaflet, RGBA raster overlays, GeoJSON |
| **2** | **Geo-Coded Photo Intelligence** | EXIF GPS/time extraction, binding to the nearest structure, evidence validation, *content* interpretation of each photograph | `piexif`, haversine binding, ExG / VARI colour indices, Laplacian sharpness |
| **3** | **Satellite Change Detection** | NDVI / NDWI / NDBI / SAVI, season-matched Δ maps, change-class accounting, hotspot ranking | Multi-epoch band math, area-weighted zonal statistics |
| **4** | **Intervention Impact Analysis** | 250 m buffer assessment, inundation-aware vegetation response, LULC transition, DEM catchment delineation, 0-100 composite impact score, ₹/ha cost-effectiveness | D8 flow routing, Strahler ordering, rule-based LULC, composite scoring |
| **5** | **Evidence Generator** | Two ReportLab PDF products: a per-structure **Evidence Pack** and a full **Micro-Watershed Assessment** | ReportLab Platypus + embedded matplotlib figures |

---

## 🏛 Architecture

```
 ┌───────────────────────────────────────────────────────────────────────────────┐
 │                          React 18 + Vite dashboard                             │
 │  Explorer │ Change │ Photos │ Thematic │ Reports      ·  Leaflet · Recharts    │
 └───────────────────────────────┬───────────────────────────────────────────────┘
                                 │  /api/v1  (Vite proxy or nginx)
 ┌───────────────────────────────▼───────────────────────────────────────────────┐
 │                            FastAPI application                                 │
 │  watersheds · interventions · photos · analytics · reports   (5 routers)       │
 └───────────┬──────────────────────────────────────────┬────────────────────────┘
             │                                          │
 ┌───────────▼──────────────┐              ┌────────────▼────────────────────────┐
 │  geospatial/ engine      │              │  reports/ evidence generator        │
 │  raster_processor        │              │  generate_intervention_pdf()        │
 │  lulc · hydrology        │─────────────►│  generate_watershed_pdf()           │
 │  exif · photo_interpreter│              │  (ReportLab + matplotlib figures)   │
 │  mapping · geo_utils     │              └─────────────────────────────────────┘
 └───────────┬──────────────┘
             │
 ┌───────────▼───────────────────────────────────────────────────────────────────┐
 │  data/sample — boundaries · DEM · 6-epoch band stacks · interventions · photos │
 └───────────────────────────────────────────────────────────────────────────────┘
```

Full component-level design: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** · API reference: **[docs/API.md](docs/API.md)** · build log: **[walkthrough.md](walkthrough.md)**.

### Why NumPy only — no GDAL / rasterio / geopandas

The engine implements its own geodetic maths, D8 hydrology, rasterisation and
point-in-polygon tests. That keeps the platform deployable on a ₹ 500/month VM,
removes a notorious installation barrier for district teams, and keeps every formula
visible and auditable in ~2,000 lines of readable Python.

---

## 🚀 Quickstart

```bash
git clone https://github.com/Yogeshsingh123-LAB/Watershed-Insight.git
cd Watershed-Insight

# 1 — dependencies
python -m pip install -r requirements.txt
cd frontend && npm install && cd ..

# 2 — build the sample dataset (~10 s)
python scripts/generate_sample_data.py

# 3 — backend  (http://localhost:8000/docs)
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000

# 4 — frontend  (http://localhost:3000)  — in a second terminal
cd frontend && npm run dev
```

> **Nothing to configure.** The bundled dataset is a physically consistent synthetic
> surrogate of the SRISHTI/DRISHTI stacks: a fractal DEM with a carved drainage network,
> six Sentinel-like acquisitions (2024 → 2026), 16 IWMP structures and 37 geo-tagged
> field photographs with **real EXIF GPS**.

### One-command verification

```bash
python scripts/verify_pipeline.py --pdf --api http://127.0.0.1:8000
# → 24 passed, 0 failed
```

### Docker

```bash
docker compose up --build     # API on :8000 · dashboard on :3000
```

---

## 🔬 The Analytical Chain in Detail

### 1 · Spectral indices (Module 3)

| Index | Formula | Reads |
| :--- | :--- | :--- |
| NDVI | (NIR − Red) / (NIR + Red) | Vegetation vigour / canopy density |
| NDWI | (Green − NIR) / (Green + NIR) | Surface water extent |
| NDBI | (SWIR − NIR) / (SWIR + NIR) | Built-up & bare/hardpan |
| SAVI | 1.5 · (NIR − Red) / (NIR + Red + 0.5) | Vegetation on sparse, bright soils |

Thresholds are constants, not magic: **NDWI > 0.10** → surface water,
**NDVI > 0.30** → vegetated, **NDVI > 0.50** → dense canopy. They are printed in every
generated PDF.

### 2 · Impact analysis around a structure (Module 4)

A **250 m circular buffer** (adjustable 50–800 m) is evaluated in *ground metres*, not
degrees, so it stays a true circle at any latitude. Pixel areas are computed per raster
row from the local latitude, so **every hectare figure is a real hectare**.

The subtle part — and the thing most naïve dashboards get wrong — is **inundation**:

```
A check dam floods 1.2 ha that used to be scrubland.
  → buffer-mean NDVI FALLS, even though the structure is working perfectly.
```

So the platform reports **two** numbers: raw buffer NDVI **and** *land-only* NDVI, which
excludes pixels that were water before **or** after the intervention. The composite
0-100 score is built from three auditable components:

```
score = vegetation response (0-40)   ← land-only ΔNDVI
      + water response      (0-40)   ← surface-water gain as % of buffer
      + spatial extent      (0-20)   ← share of the buffer that improved
```

Each structure is then labelled **High / Moderate / Low-Moderate / Inconclusive** and
given a plain-language recommendation ("replicate", "desilt and re-observe",
"field inspection required").

### 3 · Geo-coded photo interpretation (Module 2)

Every DRISHTI photograph is reduced to *physical* observations with deterministic
colour-index models — no external vision API, fully reproducible offline:

* **ExG** (2G − R − B) → vegetation fraction · **VARI** → illumination-robust greenness
* **Blue-dominance below the horizon** → impounded water (sky above the horizon is
  excluded, so a blue sky is never mistaken for a pond)
* **ExR** (1.4R − G) → bare soil / earthwork · grey low-saturation → masonry structure
* **Variance of the Laplacian** → sharpness, i.e. *is this usable as evidence?*

The photograph is then **cross-checked against the satellite buffer analysis**. Agreement
is corroboration; **disagreement is the insight** ("photo shows water, satellite shows
none → check the capture date").

Evidence validation flags: `MISSING_GPS`, `OUTSIDE_BUFFER`, `PRE_IMPLEMENTATION_BASELINE`,
`TIMESTAMP_PREDATES_STRUCTURE`, `DUPLICATE_LOCATION_WITH_…`, `BLURRED`, `UNDEREXPOSED`.

### 4 · Terrain & drainage (from the DEM)

Priority-flood sink filling → D8 flow direction → flow accumulation → stream extraction →
**Strahler ordering** → pour-point snapping and **catchment delineation**, plus slope,
aspect, TWI and the IWMP morphometric parameters (drainage density, stream frequency,
form factor, elongation ratio, relief ratio).

### 5 · LULC and the transition matrix

Six Level-2 classes (water, dense vegetation, cropland, scrub/degraded, bare/fallow,
built-up) classified by a documented decision tree, then cross-tabulated T0 → T1 so the
platform can say **"201.99 ha of scrub became cropland"** rather than just "NDVI went up".

---

## 📊 What the bundled dataset shows

| Indicator | Baseline (2024-05-28) | Latest (2026-05-26) | Change |
| :--- | :--- | :--- | :--- |
| Mean NDVI | 0.250 | 0.296 | **+0.046 (+18.6 %)** |
| Surface water | 0.00 ha | 12.77 ha | **+12.77 ha** |
| Vegetated area (NDVI > 0.30) | 68.5 ha | 272.1 ha | **+203.6 ha** |
| LULC area changed class | — | — | 246.6 ha (53.9 %) |

Both epochs are **pre-monsoon**, so the comparison is season-neutral: the gain is not
"it rained", it is "water is being held later into the dry season".

Structure ranking (250 m buffer) for `MWS-MH-2025-014`:

| Rank | Structure | Score | ΔNDVI (land) | ΔWater | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Percolation Tank #003 | **70** | +0.072 | +9.52 ha | High — replicate the design |
| 2 | Farm Pond (lined) #005 | **68** | +0.068 | +9.14 ha | High — replicate the design |
| 3 | Horti-Afforestation #008 | 55 | +0.205 | 0.00 ha | Moderate — maintain & re-observe |
| … | … | … | … | … | … |
| 10 | Farm Pond (lined) #009 | 33 | +0.078 | +0.64 ha | Low-Moderate — field inspection |

Photo-evidence audit: **37 photographs · 91.9 % machine-verified · 2 missing GPS ·
1 outside the buffer · 11 pre-works baselines.**

---

## 📡 Backend REST API

Interactive docs at **`/docs`** (Swagger) and **`/redoc`**. Full reference:
**[docs/API.md](docs/API.md)**.

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Liveness + dataset status |
| `GET` | `/api/v1/watersheds/catalog` | State → District → Block → Micro-watershed tree |
| `GET` | `/api/v1/watersheds` | List with headline indicators |
| `GET` | `/api/v1/watersheds/{id}` | Boundary + metadata + stats + epochs |
| `GET` | `/api/v1/watersheds/{id}/summary` | **Whole dashboard in one round-trip** |
| `GET` | `/api/v1/watersheds/{id}/timeseries` | Multi-epoch NDVI / NDWI / water profile |
| `GET` | `/api/v1/watersheds/{id}/lulc` | LULC areas + T0→T1 transition matrix |
| `GET` | `/api/v1/watersheds/{id}/drainage` | Stream network (GeoJSON) + morphometry (+ catchment) |
| `GET` | `/api/v1/watersheds/{id}/terrain` | Slope classes, TWI, elevation distribution |
| `GET` | `/api/v1/watersheds/{id}/overlays[/{name}]` | Rendered transparent map overlays |
| `GET` | `/api/v1/interventions` | Structures as GeoJSON (filter by type/status) |
| `GET` | `/api/v1/interventions/ranking` | Impact ranking + recommendations + ₹/ha |
| `GET` | `/api/v1/interventions/{id}/analysis` | Full evidence bundle (buffer + LULC + photos + cross-checks) |
| `GET` | `/api/v1/interventions/{id}/catchment` | DEM-delineated contributing area |
| `GET` | `/api/v1/analytics/{id}/change-detection` | Δ statistics between any two epochs |
| `GET` | `/api/v1/analytics/{id}/hotspots` | Block-aggregated change hotspots |
| `GET` | `/api/v1/photos` | Photo archive with binding + validation |
| `POST` | `/api/v1/photos/upload` | Ingest geo-tagged JPEGs (EXIF → bind → validate) |
| `GET` | `/api/v1/photos/{id}/interpretation` | Automated content interpretation |
| `POST` | `/api/v1/reports/intervention/{id}` | **PDF evidence pack** |
| `POST` | `/api/v1/reports/watershed/{id}` | **PDF micro-watershed assessment** |

---

## 🖥 Frontend Modules

| Tab | Contents |
| :--- | :--- |
| **Overview** | KPI tiles, selected-structure score card, seasonal response chart, intervention ranking, evidence audit |
| **Change** | Index/epoch pickers, pixel-change class histogram, gainer/loser hotspots, monsoon water cycle |
| **Photos** | Drag-and-drop uploader, evidence-quality stats, validation-flag histogram, gallery, per-photo interpretation modal |
| **Thematic** | LULC layer shortcuts, T0/T1 composition chart, top transitions, morphometry, slope classes, catchment |
| **Reports** | Evidence-pack & assessment generators, contents summary, recently generated documents |

Detail modal: structure parameters, geo-coded photograph with EXIF stamp and automated
read, buffer KPIs, seasonal chart, LULC transition table and the limitation notice.

---

## 🗂 Repository Layout

```
Watershed-Insight/
├── backend/app/
│   ├── main.py                 # FastAPI app, static mounts, lifespan warm-up
│   ├── config.py               # env-driven settings
│   ├── routers/                # watersheds · interventions · photos · analytics · reports
│   └── services/store.py       # data access, caching, analytics, photo index
├── geospatial/
│   ├── geo_utils.py            # haversine, raster grid, masks, statistics
│   ├── raster_processor.py     # epochs, indices, buffer & zonal analytics, change detection
│   ├── lulc.py                 # classification, areas, transition matrix
│   ├── hydrology.py            # sink fill, D8, Strahler, catchment, morphometry
│   ├── exif_engine.py          # EXIF I/O, binding, evidence validation
│   ├── photo_interpreter.py    # colour-index content interpretation + cross-check
│   └── mapping.py              # overlays + report figures
├── reports/pdf_generator.py    # Module 5 — the two PDF products
├── scripts/
│   ├── generate_sample_data.py # the reproducible synthetic dataset
│   └── verify_pipeline.py      # 24-step end-to-end verification
├── tests/                      # 49 tests (engine + API + PDF validity)
├── frontend/src/               # React dashboard
├── docs/                       # ARCHITECTURE.md · API.md · walkthrough
├── data/sample/                # generated dataset (boundaries, DEM, 6 epochs, photos)
├── Dockerfile · docker-compose.yml · requirements.txt · Makefile
├── README.md · walkthrough.md · LICENSE
└── docs/ · tests/ · scripts/
```

---

## 🧪 Testing

```bash
python -m pytest tests/ -v        # 49 tests, ~8 s
```

| Suite | Covers |
| :--- | :--- |
| `tests/test_geospatial.py` | Geodesy (haversine against known distances), raster grid ↔ world, buffer area vs πr², index maths, LULC rules, transition conservation, D8 routing on a plane, sink filling, Strahler ordering, EXIF DMS round-trip, photo interpretation |
| `tests/test_api.py` | Every REST endpoint, payload consistency (areas add up, 100 % partitions), ranking monotonicity, upload → binding → validation, PDF validity (`%PDF` magic bytes) |

---

## 🛣 Roadmap / Production Integration

The platform is deliberately adapter-shaped so real data can be swapped in:

1. **Satellite ingestion** — replace `bands.npz` with a Sentinel-2 / Landsat fetch
   (Sentinel Hub, GEE export, or BHUVAN) writing the same `{red, green, nir, swir}` +
   `bounds` contract. `RasterProcessor` needs no change.
2. **SRISHTI sync** — point `WS_DATA_DIR` at a nightly mirror of the SRISHTI GeoJSON
   services for boundaries and intervention inventories.
3. **DRISHTI sync** — the `/photos/upload` endpoint already accepts the DRISHTI export
   format; wire it to a scheduled drop folder.
4. **Scale-out** — `DataStore` is a per-watershed lazy cache; move it behind Redis or
   precompute overlays per epoch in a batch job for state-wide deployment.
5. **Model upgrades** — the photo interpreter can be swapped for a fine-tuned classifier
   while keeping the same output contract (`composition_pct`, `label`, `confidence`).

---

## ⚖️ Scientific Honesty

Every generated report carries a **Methodology & Limitations** section:

1. **Epoch pairing** — T0 and T1 are season-matched where possible; where they are not,
   part of the change is rainfall, not intervention.
2. **Resolution** — 10–20 m pixels: bunds, gully plugs and small farm ponds are sub-pixel
   and their signal is diluted.
3. **Buffer assumption** — a circular 250 m buffer is a standardised proxy; the true zone
   of influence depends on slope, soil depth and structure size.
4. **Attribution** — indicators demonstrate a *spatial association*, not causation.
   Rainfall variability, cropping change, groundwater extraction and other schemes are
   confounders.
5. **Photo evidence** — colour-index interpretation is supporting, not conclusive.
6. **Cloud** — residual cloud shadow can depress NDVI locally.

---

## 🏆 60-Second Demo Script

1. **Explorer** — pick `MWS-MH-2025-014`; the boundary, 10 structures, 37 photo pins and
   the NDVI raster appear.
2. **Change** — show ΔNDVI +0.046 and 29 % of the watershed improving; point at the
   gainer/loser hotspots.
3. **Photos** — open a photograph: EXIF GPS, "23.6 m from structure", automated read
   ("water impoundment visible — water 15.9 %"), and the satellite cross-check.
4. **Impact** — click *Percolation Tank #003*: score **70/100 (High)**, +9.52 ha of water,
   land-only ΔNDVI +0.072, LULC transition, catchment delineated from the DEM.
5. **Evidence** — *Generate PDF*: a 4-page, signed, audit-ready evidence pack with maps,
   indicator tables, photographs and the limitations section.

> **"Watershed Insight turns satellite pixels and geo-tagged photographs into spatially
> validated, decision-ready evidence."**

---

## 📜 License

MIT — see [LICENSE](LICENSE). Built for Smart India Hackathon 2026 (PS26015);
synthetic dataset provided for demonstration and evaluation.
