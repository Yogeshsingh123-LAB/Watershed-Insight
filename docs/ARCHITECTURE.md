# Watershed Insight — Architecture & Design

Problem Statement **PS26015** · Smart India Hackathon 2026 · Department of Land Resources

This document is the technical companion to the [README](../README.md). It explains *how*
each part of the platform works, *why* it is built that way, and *where* to extend it.

---

## 1 · System view

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  PRESENTATION                                                                 │
│  React 18 (Vite)  ·  Leaflet 1.9  ·  Recharts 2                               │
│    App.jsx  ──  Navbar (cascade) · Sidebar (layers) · MapView · 5 panels      │
│    api.js   ──  fetch wrapper (baseURL '', Vite proxies /api + /static)       │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │  HTTP JSON  +  static PNG/JPEG
┌───────────────────────────────▼──────────────────────────────────────────────┐
│  APPLICATION  (FastAPI)                                                       │
│    main.py ─ routers: watersheds · interventions · photos · analytics · reports│
│    config.py ─ env-driven settings (pydantic-settings)                        │
│    services/store.py ─ DataStore singleton: load · cache · analyse · index    │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────────────┐
│  GEOSPATIAL ENGINE  (pure NumPy / Pillow / matplotlib — NO GDAL)              │
│    geo_utils       geodesy · RasterGrid · masks · area statistics             │
│    raster_processor epochs · indices · buffers · change detection             │
│    lulc            classification · areas · T0→T1 transition                  │
│    hydrology       sink fill · D8 · accumulation · Strahler · catchment       │
│    exif_engine     EXIF read/write · structure binding · evidence validation  │
│    photo_interpreter colour-index content analysis + satellite cross-check    │
│    mapping         overlay rendering + report figures                          │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────────────┐
│  DATA  ·  data/sample/                                                        │
│    catalog/watersheds.json · boundaries/*.geojson · dem/*.npz                 │
│    satellite/<ws>/<epoch>/bands.npz · metadata/interventions.csv · photos.csv │
│    photos/*.jpg (real EXIF GPS) · overlays/*.png (derived)                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

The same engine also drives **Module 5** (`reports/pdf_generator.py`), which renders
matplotlib figures and assembles them into ReportLab PDFs.

---

## 2 · Design decisions

| Decision | Rationale |
| :--- | :--- |
| **No GDAL / rasterio / geopandas / folium** | A district-level deployment must be `pip install`-able on a low-end VM. Every geodetic, hydrological and raster operation is implemented in ~2,000 lines of readable NumPy, which also makes each formula auditable by a reviewer. |
| **Adapters, not rewrites** | SRISHTI and DRISHTI remain the systems of record. The platform only requires a small on-disk contract (see §6), so real data can replace the bundled surrogate without touching the engine. |
| **Lazy, cached per-watershed loading** | `DataStore` memoises the processor, DEM, hydro derivatives and photo index per watershed, so a state-wide catalogue stays responsive. |
| **Physical, deterministic analysis** | Scores come from published thresholds and explicit formulas, not black-box models. Every number in a PDF can be re-derived from the printed constants. |
| **Season-matched epochs** | Pre-monsoon vs pre-monsoon. Where that is impossible the report says so, because "NDVI went up" is worthless if it rained. |
| **Two NDVI figures per structure** | Raw buffer NDVI **and** land-only NDVI (water pixels excluded), so a working check dam is not penalised for flooding its own buffer. |

---

## 3 · Geospatial engine

### 3.1 `geo_utils.py` — the geodetic foundation

* `haversine_m` — vectorised great-circle distance (validated against known city pairs in
  the test suite).
* `RasterGrid` — the single source of truth for pixel ↔ world transforms. `row_of`/`col_of`
  return **fractional pixel-centre indices**, so `col_of(lon_of(c)) == c` round-trips
  exactly. `area_map_m2()` / `area_map_ha()` return full `(h, w)` per-pixel area maps
  (pixel area shrinks with cos(latitude)); `pixel_area_m2()` returns the per-row `(h, 1)`
  vector.
* Masks: `circle_mask(lat, lon, r, band=1.0)` — ground-metre buffer with a one-pixel soft
  edge; `polygon_mask` — even-odd ray cast; `boundary_mask` — polygon ∩ valid data.
* Statistics: robust area-weighted means, percentiles and safe division.

### 3.2 `raster_processor.py` — epochs and change

* `RasterGrid` per epoch + lazy `index(epoch_key, name)`; NDVI / NDWI / NDBI / SAVI.
* `buffer_stats(lat, lon, radius_m)` → per-epoch NDVI/NDWI means, water/vegetation areas,
  land-only NDVI, and pixel-level `improved / degraded / stable` counts.
* `change_detection(t0, t1)` → Δ rasters, class histogram, area-weighted Δ statistics.
* `timeseries()` → per-epoch NDVI / NDWI / water / vegetation series for the monsoon-cycle
  chart.

### 3.3 `lulc.py` — six classes, one decision tree

`water → dense_vegetation → cropland → builtup → bare → scrub`, evaluated per pixel with
NDVI, NDWI, NDBI, SAVI and brightness. `transition()` cross-tabulates T0→T1 into a full
matrix whose grand total always equals the analysed area — an invariant asserted in the
tests.

### 3.4 `hydrology.py` — DEM → drainage → catchment

1. **Priority-flood** depression filling (in-place, integer-heap free).
2. **D8** flow direction on the filled DEM (flat areas resolved by a gradient search).
3. **Flow accumulation** via a topological sort of the D8 graph (no recursion → safe for
   large rasters).
4. **Stream extraction** at a configurable accumulation threshold → GeoJSON LineStrings.
5. **Strahler ordering** (outlet cells with `fdir == 0` are skipped, not treated as pending).
6. **Pour-point snapping** + upstream traversal → **catchment mask** for any structure.
7. **Morphometry**: drainage density, stream frequency, form factor, elongation ratio,
   relief ratio, mean slope, TWI, aspect.

### 3.5 `exif_engine.py` — DRISHTI evidence

Reads GPS (`GPSLatitude`/`GPSLongitude` with DMS→decimal, including the classic
`*3600*100` rational pitfall), `DateTimeOriginal`, camera model. Binds each photograph to
the nearest structure within a search radius and *demotes* it from `CONFIRMED` to
`ASSOCIATED` when only one loose candidate exists. Requests missing EXIF are written back
with `piexif` for round-trip verification.

Validation flags are data-driven, each with a human-readable reason:
`MISSING_GPS`, `OUTSIDE_BUFFER`, `PRE_IMPLEMENTATION_BASELINE`,
`TIMESTAMP_PREDATES_STRUCTURE`, `DUPLICATE_LOCATION_WITH_<id>`, `BLURRED`, `UNDEREXPOSED`.

### 3.6 `photo_interpreter.py` — reading the pixels of the photograph

Deterministic colour indices replace an opaque vision API:

| Quantity | Formula | Tells us |
| :--- | :--- | :--- |
| ExG | 2G − R − B (normalised) | Vegetation fraction |
| VARI | (G − R) / (G + R − B) | Illumination-robust greenness |
| Blue dominance *below horizon* | B − max(R, G), lower image half | Impounded water (sky excluded) |
| ExR | 1.4R − G | Bare soil / earthwork |
| Grey / low saturation | σ(RGB) small, medium value | Masonry / concrete structure |
| Variance of Laplacian | σ²(∇²I) | Sharpness → evidentiary quality |

The result is then **cross-checked against the 250 m satellite buffer**: agreement is
corroboration, disagreement is flagged as an insight (typically a capture-date issue).

### 3.7 `mapping.py` — overlays

PNG rasters with an alpha channel (colormaps: NDVI viridis-like, NDWI blues, Δ RdBu, LULC
categorical, DEM terrain, slope, hillshade) plus PNG overlays for every report figure.
The API serves them from `/static/overlays`; the frontend adds them as Leaflet
`imageOverlay`s bounded by the watershed bbox.

---

## 4 · Backend

`backend/app/main.py` mounts five routers and four static directories
(`/static/photos`, `/static/satellite`, `/static/overlays`, `/static/reports`), enables
CORS, and uses an `asynccontextmanager` **lifespan** to warm the caches at start-up.

`services/store.py` is the only component that touches the filesystem. It exposes:

* catalogue + hierarchy walk (state → district → block → micro-watershed),
* `watershed_summary(id)` — one payload with `stats`, `lulc`, `terrain`, `streams`,
  `interventions`, `photos`, `photo_stats`, `ranking`, `change_detection`, `hotspots`,
  `timeseries` (stream count capped at 400 features for map performance),
* intervention analysis bundles (buffer KPIs, LULC transition, photos, cross-checks,
  catchment, recommendation, cost-effectiveness),
* photo index and upload ingestion (gated by `WS_PERSIST_UPLOADS` so tests never mutate
  the shipped dataset),
* PDF generation delegates.

### Configuration (`backend/app/config.py`, `.env`)

```
WS_DATA_DIR      # dataset root            default data/sample
WS_OUTPUT_DIR    # overlay output          default data/sample/overlays
WS_REPORTS_DIR   # PDF output              default reports/generated
WS_BUFFER_M      # assessment radius       default 250
WS_CORS_ORIGINS  # "*" or comma list       default *
WS_PERSIST_UPLOADS  # append uploads to photos.csv  default true
```

---

## 5 · Frontend

`App.jsx` owns the watershed / epoch / layer state and renders one of five panels.

| Component | Role |
| :--- | :--- |
| `Navbar` | Administrative cascade + epoch picker + global KPIs |
| `Sidebar` | 13 layer toggles (boundary, DEM, slope, hillshade, NDVI T0/T1, ΔNDVI, NDWI, LULC, drainage, structures, photos) |
| `MapView` | Leaflet: boundary, structure markers (priority-coloured), photo pins, raster overlays, buffer circles |
| `OverviewPanel` | KPI tiles, selected-structure card, seasonal chart, ranking table, evidence audit |
| `ChangePanel` | Index/epoch pickers, change-class histogram, gainer/loser hotspots, monsoon cycle |
| `PhotosPanel` | Uploader, quality stats, flag histogram, gallery, interpretation modal |
| `ThematicPanel` | LULC composition, top transitions, morphometry, slope classes, catchment |
| `ReportsPanel` | Evidence-pack & assessment generators, contents summary, recent documents |
| `InterventionModal` | Structure parameters, geo-coded photo + EXIF stamp + automated read, buffer KPIs, seasonal chart, LULC transitions, limitations |

`api.js` uses a **relative** base URL; Vite (and nginx in Docker) proxies `/api` and
`/static` to the backend, so the browser never sees a second origin.

---

## 6 · Data contract (how to plug in real SRISHTI / DRISHTI data)

```
data/sample/
├── catalog/watersheds.json          # id, name, state, district, block, area_ha, epochs[]
├── boundaries/<id>.geojson          # Polygon / MultiPolygon of the micro-watershed
├── dem/<id>_dem.npz                 # {'dem': float32[h,w], 'bounds': [minx,miny,maxx,maxy]}
├── satellite/<id>/<epoch>/bands.npz # {'red','green','nir','swir', 'bounds', 'date', 'cloud'}
├── metadata/interventions.csv       # id, name, type, lat, lon, cost_inr, status, ...
└── metadata/photos.csv              # filename, intervention_id, captured_on, ...
```

Keep the array keys, dtype (`float32`) and `bounds` order and the entire engine, API and
dashboard work unchanged. Satellite bands are surface-reflectance-like floats in 0–1.

---

## 7 · Reproducing everything

```bash
python scripts/generate_sample_data.py          # synthetic dataset (deterministic seed)
python scripts/verify_pipeline.py --pdf --api http://127.0.0.1:8000
python -m pytest tests/ -q                      # 49 tests
```

`scripts/verify_pipeline.py` walks the full
DATA → INFORMATION → ANALYSIS → INTERPRETATION → DECISION-SUPPORT → API chain in 24
checks and prints a pass/fail table; `--pdf` additionally generates both PDF products and
validates them.

---

## 8 · Known limitations

See the *Scientific Honesty* section of the README — epoch pairing, 10–20 m resolution,
the circular-buffer assumption, attribution vs causation, supporting-only photo evidence,
and residual cloud shadow. They are surfaced in the UI and printed in every generated PDF
rather than hidden.
