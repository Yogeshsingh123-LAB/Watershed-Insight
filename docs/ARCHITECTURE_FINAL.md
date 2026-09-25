# System Architecture & Component Reference

**Watershed Insight · SIH PS26015**

---

## Component Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                                         │
│  React 18 + Vite  ·  Leaflet 1.9  ·  Recharts  ·  Tailwind CSS               │
│                                                                             │
│  Navbar & Cascade  │  Layer Sidebar   │  Map View & Overlays                   │
│  ──────────────────┴──────────────────┴──────────────────────────────────── │
│  Panels:                                                                    │
│  • Dashboard / Overview        • Decision Center (Action Queue)             │
│  • Before / After              • Evidence Health & Quality                  │
│  • Change Detection            • DRISHTI Photos & EXIF                      │
│  • Field Inspections           • Data Sources Architecture                  │
│  • Reports Engine              • Audit Trail                                │
│  • Ask Watershed Insight AI                                                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP REST JSON / Static Artifacts
┌──────────────────────────────────────▼──────────────────────────────────────┐
│  APPLICATION & GOVERNANCE LAYER (FastAPI)                                   │
│  main.py  ── Routers: watersheds · interventions · photos · analytics        │
│                        reports · data_sources · field_inspections · audit · ai│
│  Services:                                                                  │
│  • DataStore Singleton (cache, indexing, analysis)                          │
│  • AuditService (log persistence & filtering)                               │
│  • FieldInspectionService (task lifecycle)                                  │
│  • AiExplainerService (evidence-bounded interpretation)                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│  GEOSPATIAL NUMPY ENGINE (No GDAL / No Paid APIs)                           │
│  geo_utils        Geodesy, spherical pixel areas, circular buffers, stats    │
│  raster_processor Multi-epoch indices (NDVI/NDWI/NDBI/SAVI), buffer deltas   │
│  lulc             6-class decision tree, area conservation, transition matrix│
│  hydrology        Depression fill, D8 flow routing, Strahler, catchment       │
│  exif_engine      EXIF DMS parsing, spatial binding, quality validation      │
│  photo_interpreter Colour-index content analysis (ExG/VARI/ExR), cross-check │
│  scoring          40/40/20 impact decomposition, 6-factor confidence         │
│  mapping          Overlay PNG generation with alpha channel                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│  DATA CONTRACT LAYER                                                        │
│  data/sample/ (Catalog, Boundaries, DEM, Sentinel-2 NPZ, Metadata CSVs)      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Backend Routers & Endpoints

| Router | Prefix | Endpoints |
| :--- | :--- | :--- |
| `watersheds` | `/api/v1/watersheds` | `GET /`, `GET /catalog`, `GET /{id}`, `GET /{id}/summary`, `GET /{id}/stats`, `GET /{id}/timeseries`, `GET /{id}/lulc`, `GET /{id}/drainage`, `GET /{id}/terrain`, `GET /{id}/environment`, `GET /{id}/decision-summary` |
| `interventions` | `/api/v1/interventions` | `GET /`, `GET /ranking`, `GET /{id}`, `GET /{id}/analysis`, `GET /{id}/timeseries`, `GET /{id}/catchment`, `GET /{id}/timeline`, `GET /{id}/before-after`, `GET /{id}/evidence-health`, `GET /{id}/decision`, `PATCH /{id}/status` |
| `data_sources` | `/api/v1/data-sources` | `GET /` |
| `field_inspections`| `/api/v1/field-inspections`| `GET /`, `POST /`, `PATCH /{id}` |
| `audit` | `/api/v1/audit` | `GET /` |
| `ai` | `/api/v1/ai` | `POST /explain`, `POST /query` |
| `reports` | `/api/v1/reports` | `GET /`, `GET /{filename}`, `POST /intervention/{id}`, `POST /watershed/{id}` |
