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

---

# Round 2 — from "it runs" to "it is defensible"

After the first completion the project was reviewed against the SIH rubric.
Three assessments converged on the same conclusion: **stop adding features —
prove the ones that exist.** This round implements that.

## What the reviews asked for, and what was done

| # | Ask | Delivered |
| ---: | :--- | :--- |
| 1 | Run it on real satellite data | **Done.** `scripts/ingest_sentinel.py` pulls public Sentinel-2 L2A via STAC and a terrain-tile DEM, and the full pipeline was run over **Ralegaon Siddhi, Ahmednagar** (726 ha, 6 acquisitions). See `docs/VALIDATION.md`. |
| 2 | Split Impact from Confidence | **Done.** New `geospatial/scoring.py`: impact (0-100) and a six-factor confidence (0-100) computed from measurable evidence quality. Exposed through the API, the dashboard and both PDFs. |
| 3 | Pre-empt "where's the AI?" | **Done.** The title no longer claims AI at all; the README states the deterministic-vs-ML split up front and `docs/SIH_PREP.md` §2 gives the table, the wording, and the discipline ("lead with geospatial decision-support; say AI only when asked"). |
| 4 | Defend the 40/40/20 weights | **Done.** `scripts/sensitivity.py` recomputes the ranking under 8 weightings and 4 radii; ρ ≥ 0.87 across plausible reweightings. Published in the docs. |
| 5 | Give the repo a real commit history | **Done.** Work is committed in logical layers (engine → API → frontend → reports → data → scripts → tests → docs) rather than as one blob. |

## Beyond the three reviews

Two things none of the reviews proposed, both prompted by running on real data:

**1 · Calibration (known-answer) tests.** "49 tests pass" only proves the code
agrees with itself. `tests/test_calibration.py` (15 tests) proves the
*measurements* are right: a planted water body of known area is recovered within
5 %; a 250 m buffer encloses πr² ha within 1 %; doubling the radius quadruples
the area; area-weighting changes the mean with latitude; cloud-masked pixels do
not bias a statistic; the score is monotonic in each component; the control
sample is reproducible.

**2 · Background (control) comparison.** A score of 65 sounds mediocre in the
abstract. The platform now runs the identical scoring chain at **200 seeded
random control points** inside the boundary and reports each structure's
percentile against that background, plus a **difference-in-differences** figure
net of watershed-wide change.

```
synthetic AOI background : 27.9 ± 18.0   → top structure 65 = p97
real AOI background      :  2.37 ± 2.17  → candidates 1.4-3.6 = p32-p85
```

The real-AOI result is a **correct negative**: those six sites are DEM-sited
candidates where nothing was built, and the platform finds no signal
distinguishable from background. That validates the machinery better than a
positive result would have.

## What real data broke (and fixed)

1. **NaN propagation** — `np.average` carried masked pixels into every headline
   statistic, so a cloudy epoch returned `null`. All statistics now route
   through `nan_weighted_mean()`.
2. **NDBI is not a built-up detector over dry basalt** — measured NDBI spans
   +0.013 (p1) to +0.236 (p99) with median +0.136, so `NDBI > 0.02` labelled
   **65 % of a rural watershed as settlement**. Threshold recalibrated to 0.20
   (7.84 ha, ~1 %), justified by the measured distribution in
   `data/real/calibration.json`.
3. **Thresholds are now data, not code** — any dataset can override them with a
   `calibration.json` beside its catalog, so the next terrain can be calibrated
   the same way instead of by guesswork.
4. **"No water detected" was a finding, not a bug** — pre-monsoon SWIR never
   falls below 0.124 and MNDWI peaks at −0.058, i.e. there is genuinely no open
   water in that window in May. A ~0.16 ha body appears post-monsoon.

## Round 3 — making the words match the code

A third pass checked the claims against the code and found three places where
the prose claimed a hair more than the evidence supported. All three fixed:

1. **The title said "AI-Assisted."** The H1 now reads *"A Geospatial
   Decision-Support Platform"*. The deterministic-vs-ML explanation is still
   there — it just no longer advertises a claim the prototype does not make.
   `docs/SIH_PREP.md` now instructs the team: lead with "geospatial
   decision-support", say "AI" only when asked.
2. **"₹ 500/month VM" was asserted, never benchmarked.** Now described as a
   *design target* (no GPU, no paid inference API, one small VM) with an
   explicit statement that no CPU/RAM/latency benchmark has been published.
3. **"Full pipeline on real data" was too broad.** The README now separates what
   was verified on real imagery (ingestion → masking → indices → LULC →
   hydrology → change detection → impact/confidence → PDF) from what was not:
   the **DRISHTI photo-evidence half**, which has no field photographs for that
   AOI and is validated only on the synthetic surrogate, and impact
   *attribution*, since the real-AOI sites are DEM-sited candidates rather than
   surveyed structures.

One more phrasing discipline was added for the pitch: the
difference-in-differences figure is an **estimate of the structure's own
contribution**, never "the causal effect" — the repo's own limitation #4
(*spatial association, not causation*) is the fallback sentence.

## Current state

```
$ python -m pytest tests/ -q
64 passed in ~13 s

$ python scripts/verify_pipeline.py --pdf --api http://127.0.0.1:8000
24 passed, 0 failed

$ python scripts/sensitivity.py --data-dir data/real
ROBUST within the plausible range (rho >= 0.986)
```

Two API instances are provided: `:8000` on the synthetic demo dataset
(full photo/EXIF features) and `:8001` on the real Sentinel-2 AOI.

## The remaining gap, stated plainly

**Impact attribution is not yet validated on real data (T4).** The measurement
chain is; the detection of real, dated structures is not, because no public
inventory of that kind exists for the AOI. Closing it requires one district
PMKSY-WDC inventory (structure type, GPS, commissioning date) — a **data**
substitution, not a code change. Plan in `docs/VALIDATION.md` §6.
