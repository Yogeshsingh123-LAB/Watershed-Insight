# Watershed Insight — Walkthrough

**SIH 2026 · PS26015** — *Application of Geospatial Techniques for visualization and
analysis to interpret Geo-Coded Images to enhance watershed Development Outcomes.*
Department of Land Resources, Ministry of Rural Development.

This walkthrough records (1) where the repository stood when work resumed, (2) what was
built to complete it, (3) how every module meets the problem statement, (4) the
verification evidence, and (5) how to run and demo it.

---

## 1 · Where the project stood

The repository contained the scaffolding of the idea — 33 tracked files:

| Present | State |
| :--- | :--- |
| `geospatial/raster_processor.py` | Single-epoch index maths (NDVI/NDWI), no multi-epoch model |
| `reports/pdf_generator.py` | Skeleton |
| `scripts/generate_sample_data.py` | Two-epoch synthetic rasters (`before`/`after`), 4 sample JPEGs |
| `frontend/src/` — `App.jsx`, `Navbar`, `Sidebar`, `WatershedMap`, `AnalyticsPanel`, `InterventionModal` | Components existed but were not wired to a live API; `Navbar` destructured a `states/districts/blocks` prop that no parent supplied, so it threw on render |
| `backend/` | `main.py` only — no routers, no services, no data layer |
| `data/sample/` | 1 watershed, 4 photos, no DEM, no interventions, no catalog |

**Net effect:** the app had a map shell that could not start (no routers → no data →
`Navbar` threw), a two-date raster pair with no time series, and no evidence or reporting
chain.

## 2 · What was built

### 2.1 Geospatial engine (`geospatial/`, ~2,400 lines)

| File | What it adds |
| :--- | :--- |
| `geo_utils.py` | Haversine geodesy, `RasterGrid` (pixel-centre ↔ world transforms that round-trip exactly), ground-metre circular/polygon masks, **latitude-aware per-pixel area maps**, area-weighted statistics |
| `raster_processor.py` | Rewritten around a **multi-epoch** model: 6 acquisitions, lazy NDVI/NDWI/NDBI/SAVI, buffer zonal statistics, **land-only NDVI** (water pixels excluded), change detection, time series, hotspots |
| `lulc.py` | Six-class Level-2 classification from a documented decision tree + **T0→T1 transition matrix** |
| `hydrology.py` | Priority-flood sink fill → D8 → flow accumulation (iterative, no recursion) → stream extraction → **Strahler order** → pour-point snapping → catchment delineation → IWMP morphometry (drainage density, stream frequency, form factor, elongation & relief ratio, TWI) |
| `exif_engine.py` | EXIF GPS/Datetime read **and write**, DMS→decimal (the `*3600*100` rational pitfall fixed), haversine binding to the nearest structure with `CONFIRMED`/`ASSOCIATED` demotion, and a data-driven validation flag set |
| `photo_interpreter.py` | Deterministic colour-index interpretation of photograph *content* (ExG, VARI, blue-dominance below the horizon, ExR, grey detection, Laplacian sharpness) + **cross-check against the satellite buffer** |
| `mapping.py` | Alpha-blended overlays (NDVI, NDWI, Δ, LULC, DEM, slope, hillshade) and every matplotlib figure used in the PDFs |

No GDAL/rasterio/geopandas/folium — deliberately: the engine is NumPy + Pillow +
matplotlib so a district team can install it with `pip` alone.

### 2.2 Backend (`backend/app/`)

FastAPI with **five routers and 36 endpoints** (`watersheds`, `interventions`, `photos`,
`analytics`, `reports`), four static mounts, CORS, an env-driven `config.py`, and a
`services/store.py` data layer that lazily loads and caches each watershed's processor,
DEM, hydro derivatives and photo index. `on_event("startup")` was migrated to an
`asynccontextmanager` **lifespan** to remove the deprecation warning.

### 2.3 Frontend (`frontend/src/`)

The dashboard was rebuilt around real data:

* `App.jsx` owns watershed / epoch / layer / selection state and a single
  `/watersheds/{id}/summary` fetch.
* `Navbar` — real administrative cascade (State → District → Block → Micro-watershed)
  with epoch picker and headline KPIs.
* `Sidebar` — 13 layer toggles.
* `MapView` — Leaflet map: boundary, photo pins, structure markers (priority-coloured),
  raster overlays, buffer circles, catchment.
* Five panels: **Overview · Change · Photos · Thematic · Reports** (`AnalyticsPanel.jsx`
  was superseded by `ChangePanel` + `ThematicPanel` and deleted).
* `InterventionModal` — structure parameters, geo-coded photo with EXIF stamp and
  automated read, buffer KPIs, seasonal chart, LULC transition table, limitations.
* `api.js` uses a relative base URL; Vite (and nginx in Docker) proxies `/api` and
  `/static`, so the browser sees a single origin.

### 2.4 Data

`scripts/generate_sample_data.py` was rewritten to produce a **physically consistent**
surrogate of the SRISHTI/DRISHTI stacks: a fractal DEM with a carved channel network,
hydrologically-sited (not randomly-placed) structures, **six** Sentinel-like acquisitions
(May 2024 → Sep 2026, pre-monsoon pairs), and 37 field photographs written with **real
EXIF GPS** via `piexif`.

| | `MWS-MH-2025-014` (`watershed_001`) | `MWS-MH-2025-021` (`watershed_002`) |
| :--- | :--- | :--- |
| Area | 457.12 ha | 356.67 ha |
| Interventions | 10 (5 types) | 6 |
| Photos | 37 (91.9 % verified) | 29 |
| Mean NDVI | 0.250 → 0.296 (**+18.6 %**) | — (Δ +0.029) |
| Surface water | 0.00 → 12.77 ha | 13.56 ha |
| Vegetated area | 68.5 → 272.1 ha | — |
| DEM relief / channels | 143.49 m / 36.27 km (order 4) | — |

### 2.5 Evidence generation (Module 5)

`reports/pdf_generator.py` produces two ReportLab products, each 4 pages, each ending with
an explicit **Methodology & Limitations** section:

* `generate_intervention_pdf(store, intervention_id, path, radius_m=250)` → 694 KB
* `generate_watershed_pdf(store, watershed_id, path, radius_m=250)` → 831 KB

### 2.6 Quality, packaging and docs

* **49 tests** (`tests/test_geospatial.py` 23 · `tests/test_api.py` 26) — geodesy against
  known distances, buffer area vs πr², index maths, LULC transition conservation, D8
  routing on an inclined plane, sink filling, Strahler ordering, EXIF DMS round-trip,
  every REST endpoint, ranking monotonicity, upload→binding→validation, PDF magic bytes.
* `scripts/verify_pipeline.py` — 24 checks across
  DATA → INFORMATION → ANALYSIS → INTERPRETATION → DECISION SUPPORT → API.
* `requirements.txt`, `requirements-dev.txt`, `.env.example`, `Makefile`, `Dockerfile`,
  `docker-compose.yml`, `frontend/Dockerfile`, `frontend/nginx.conf`, `.dockerignore`,
  `.gitignore`, `LICENSE`.
* `README.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, this walkthrough.

---

## 3 · How the solution maps to PS26015

| Expected solution (PS text) | Delivered by |
| :--- | :--- |
| **(a)** Integrated GIS/RS visualisation fusing DRISHTI geo-tagged photos with SRISHTI satellite data | Explorer map with 13 layers; photo pins bound to structures and cross-checked against the satellite buffer |
| **(b)** Improved geo-coded image interpretation (land use, vegetation, water, interventions, environmental change) | EXIF engine + colour-index photo interpreter + 6-class LULC + NDVI/NDWI/NDBI/SAVI change detection |
| **(c)** Thematic maps — LULC, drainage, vegetation, intervention, change detection | `mapping.py` overlays: LULC, DEM/slope/hillshade, drainage + Strahler, NDVI/NDWI, Δ change, intervention buffer/catchment |
| **(d)** Enhanced monitoring and assessment | 6-epoch time series, 250 m buffer assessment with land-only NDVI, 0-100 composite impact score, hotspots, ₹/ha cost-effectiveness |
| **(e)** Scientific decision support | Ranking with confidence bands and plain-language recommendations, prioritised action list, signed PDF evidence for audit |
| **(f)** Scalable, cost-effective, replicable | Pure-NumPy engine (no GDAL), adapter-shaped data contract, Docker + docker-compose, lazy per-watershed caching, 49-test regression suite |

---

## 4 · Verification

All three gates are green:

```
$ python -m pytest tests/ -q
49 passed in 8.1s

$ python scripts/verify_pipeline.py --pdf --api http://127.0.0.1:8000
24 passed, 0 failed
   ✓ 2 watersheds · 457.12 ha boundary · 10 interventions · DEM relief 143.49 m
   ✓ 6 acquisitions · 37 photos indexed (34 verified) · NDVI 0.296 mean (250×250)
   ✓ 6 LULC classes · 36.272 km channels · ΔNDVI +0.0465 · Δwater +12.77 ha
   ✓ 29.1 % of area improved · 25 hotspot blocks
   ✓ top rank INT-PT-003 → 70/100 (High), ΔNDVI(land) +0.072, Δwater +9.52 ha
   ✓ intervention PDF 694 KB · watershed PDF 831 KB · all API endpoints 200
```

Additionally the built frontend was executed in a headless DOM (jsdom) against a live
backend: the app rendered 53.6 kB of markup, all five tab panels (7–17 kB each) and the
intervention modal (9.9 kB) rendered live data, with **0 console errors**.

Known non-blocking notice: one `DeprecationWarning` from Starlette's `TestClient`
(`app=` argument) — the production code path uses `httpx.ASGITransport` semantics and is
unaffected.

---

## 5 · Running it

```bash
python -m pip install -r requirements.txt
cd frontend && npm install && cd ..

python scripts/generate_sample_data.py          # ~10 s, deterministic
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
cd frontend && npm run dev                      # http://localhost:3000
```

Or `make dev` / `docker compose up --build` (API :8000, dashboard :3000).

---

## 6 · Demo script (60 seconds)

1. **Explorer** — `MWS-MH-2025-014` loads with boundary, 10 structures, 37 photo pins, NDVI raster.
2. **Change** — ΔNDVI +0.046, 29 % of the watershed improving, gainer/loser hotspots.
3. **Photos** — open a photograph: EXIF GPS, "23.6 m from structure", automated read
   *"Water impoundment visible — water 15.9 %"*, satellite cross-check **AGREE**.
4. **Impact** — *Percolation Tank #003*: **70/100 (High)**, +9.52 ha water, land-only
   ΔNDVI +0.072, LULC transition, DEM-delineated catchment.
5. **Evidence** — *Generate PDF*: a 4-page audit-ready evidence pack with maps, indicator
   tables, photographs and limitations.

---

## 7 · Honest limitations

1. **Epoch pairing** — season-matched where possible; where not, part of the change is
   rainfall, not intervention (stated in every report).
2. **Resolution** — 10–20 m pixels; bunds, gully plugs and small farm ponds are sub-pixel
   and their signal is diluted.
3. **Buffer assumption** — a circular 250 m buffer (adjustable 50–800 m) is a standardised
   proxy, not the true hydrological zone of influence.
4. **Attribution** — the evidence shows spatial *association*, not causation; rainfall
   variability, cropping change and groundwater extraction are confounders.
5. **Photo evidence** — colour-index interpretation is supporting, not conclusive.
6. **Cloud** — residual cloud shadow can depress NDVI locally.

---

## 8 · Next steps for production

1. Swap `bands.npz` for a real Sentinel-2/Landsat or BHUVAN fetch (same array contract —
   `RasterProcessor` needs no change).
2. Point `WS_DATA_DIR` at a nightly SRISHTI GeoJSON mirror for boundaries and inventories.
3. Wire `/photos/upload` to a scheduled DRISHTI export folder.
4. Batch-precompute overlays per epoch and back `DataStore` with Redis for state-wide scale.
5. Replace the colour-index photo interpreter with a fine-tuned classifier while keeping
   the same output contract (`composition_pct`, `label`, `confidence`).
