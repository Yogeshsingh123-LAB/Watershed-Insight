# Watershed Insight — REST API Reference

Base path **`/api/v1`** · Interactive docs at **`/docs`** (Swagger UI) and **`/redoc`**.
All responses are JSON; all coordinates are WGS-84 decimal degrees; all areas are
hectares computed from true ground metres.

Query parameters in `[]` are optional.

---

## System

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | `{"status":"healthy", "watersheds":2, "interventions":16, "photos":37}` |

---

## Watersheds — `/api/v1/watersheds`

| Method | Path | Key params | Returns |
| :--- | :--- | :--- | :--- |
| `GET` | `/watersheds` | — | List: `id, name, state, district, block, area_ha, interventions, photos, ndvi_change, water_ha` |
| `GET` | `/watersheds/catalog` | — | Hierarchy `{states:[{districts:[{blocks:[{watersheds:[…]}]}]}]}` |
| `GET` | `/watersheds/{id}` | — | `watershed` + `boundary` (GeoJSON) + `stats` + `epochs` + `bounds` |
| `GET` | `/watersheds/{id}/summary` | `[t0]`, `[t1]` | **Full dashboard payload** (see below) |
| `GET` | `/watersheds/{id}/stats` | `[t0]`, `[t1]` | Headline indicators only |
| `GET` | `/watersheds/{id}/timeseries` | — | Per-epoch `date, ndvi_mean, ndwi_mean, water_ha, veg_ha` |
| `GET` | `/watersheds/{id}/lulc` | `[t0]`, `[t1]` | Per-class areas, percentages, and the T0→T1 **transition matrix** |
| `GET` | `/watersheds/{id}/drainage` | `[threshold]`, `[lat]`, `[lon]` | Stream network GeoJSON + morphometry (+ `catchment` polygon when `lat`/`lon` given) |
| `GET` | `/watersheds/{id}/terrain` | — | Elevation distribution, slope classes, aspect, TWI |
| `GET` | `/watersheds/{id}/overlays` | — | Catalogue of rendered overlay PNGs with bounds |
| `GET` | `/watersheds/{id}/overlays/{name}` | — | Overlay manifest (`url`, `bounds`, `colormap`, `legend`) |

### `GET /watersheds/{id}/summary` — the one-shot payload

```jsonc
{
  "watershed":      { "id": "MWS-MH-2025-014", "name": "…", "state": "Maharashtra",
                      "district": "Ahmednagar", "block": "Parner", "area_ha": 457.12 },
  "bounds":         [[19.8345, 75.328], [19.8545, 75.358]],
  "overlay_bounds": [[19.8345, 75.328], [19.8545, 75.358]],
  "epochs":         [{ "key": "2024-05-28", "date": "2024-05-28", "cloud": 3.1 }, …],
  "stats":          { "ndvi_mean_t0": 0.2496, "ndvi_mean_t1": 0.2961,
                      "ndvi_change": 0.0465, "ndvi_change_pct": 18.6,
                      "water_area_ha_t0": 0.0, "water_area_ha_t1": 12.77,
                      "veg_area_ha_t0": 68.52, "veg_area_ha_t1": 272.13, … },
  "lulc":           { "classes": [{ "key": "cropland", "t1_ha": 259.16, "t1_pct": 56.7 }],
                      "transition": { "changed_area_ha": 246.56, "changed_pct": 53.92,
                                      "matrix": [[…]] } },
  "terrain":        { "morphometry": { "basin_area_ha": 699.38, "total_relief_m": 143.49,
                                       "mean_slope_pct": 12.56, "stream_length_km": 36.27,
                                       "drainage_density_km_per_km2": 5.186,
                                       "max_strahler_order": 4, "form_factor": 0.219 },
                      "elevation": {…}, "slope": {…}, "twi": {…} },
  "streams":        { "type": "FeatureCollection", "features": [ … ≤ 400 … ] },
  "interventions":  [ { "id": "INT-PT-003", "type": "Percolation Tank",
                        "lat": 19.8415, "lon": 75.3390, "cost_inr": 320000,
                        "status": "Completed", "impact_score": 69.7 } ],
  "photos":         [ { "id": "IMG_0042.jpg", "lat": …, "lon": …, "captured_on": …,
                        "intervention_id": "INT-PT-003", "distance_m": 23.6,
                        "validation_status": "VERIFIED",
                        "flags": [], "url": "/static/photos/IMG_0042.jpg",
                        "interpretation": { "label": "Water impoundment visible",
                                            "confidence": "High",
                                            "composition_pct": {"water": 15.9, …},
                                            "cross_check": {…} } } ],
  "photo_stats":    { "total": 37, "with_gps": 35, "verified": 34,
                      "verified_pct": 91.9, "flags": {…} },
  "ranking":        [ { "rank": 1, "id": "INT-PT-003", "impact_score": 69.7,
                        "confidence": "High", "ndvi_change_land": 0.072,
                        "water_area_change_ha": 9.52, "recommendation": "…" } ],
  "change_detection": { "classes": [{ "key": "improved", "pct": 29.1 }], "delta": {…} },
  "hotspots":       [ { "block_id": "r12c07", "ndvi_change": 0.21, "pct": 3.4 } ],
  "timeseries":     [ { "date": "2024-05-28", "ndvi_mean": 0.2496, "water_ha": 0.0 } ]
}
```

---

## Interventions — `/api/v1/interventions`

| Method | Path | Key params | Returns |
| :--- | :--- | :--- | :--- |
| `GET` | `/interventions` | `[watershed_id]`, `[type]`, `[status]` | GeoJSON `FeatureCollection` of structures |
| `GET` | `/interventions/ranking` | `[watershed_id]`, `[radius_m]` | Sorted impact ranking with scores, components, recommendation and ₹/ha |
| `GET` | `/interventions/{id}` | — | Single structure record |
| `GET` | `/interventions/{id}/analysis` | `[radius_m]`, `[t0]`, `[t1]` | **Full evidence bundle** |
| `GET` | `/interventions/{id}/timeseries` | — | Seasonal response inside the buffer |
| `GET` | `/interventions/{id}/catchment` | — | DEM-delineated contributing area (GeoJSON + stats) |

### `GET /interventions/{id}/analysis`

```jsonc
{
  "intervention": { "id": "INT-PT-003", "name": "Percolation Tank #003",
                    "type": "Percolation Tank", "cost_inr": 320000,
                    "commissioned_on": "2024-11-20", "status": "Completed" },
  "buffer":      { "radius_m": 250, "area_ha": 19.63,
                   "ndvi_t0": 0.231, "ndvi_t1": 0.298, "ndvi_change": 0.067,
                   "ndvi_land_t0": 0.231, "ndvi_land_t1": 0.303, "ndvi_change_land": 0.072,
                   "water_ha_t0": 0.00, "water_ha_t1": 9.52, "water_change_ha": 9.52,
                   "improved_pct": 61.4, "degraded_pct": 3.1, "stable_pct": 35.5 },
  "impact":      { "score": 69.7, "confidence": "High",
                   "components": { "vegetation": 28.8, "water": 25.2, "extent": 15.7 },
                   "recommendation": "High impact — replicate the design in similar settings.",
                   "cost_effectiveness_inr_per_ha": 33613 },
  "lulc":        { "classes": […], "transition": { "top": [{ "from": "scrub",
                     "to": "cropland", "ha": 5.31 }] } },
  "photos":      [ … evidence records with interpretation + cross-check … ],
  "cross_checks": [ { "source": "photo vs satellite", "photo_says": "water present",
                      "satellite_says": "water 9.52 ha", "verdict": "AGREE",
                      "note": "…" } ],
  "timeseries":  [ … ],
  "catchment":   { "area_ha": 41.2, "geometry": {…} },
  "limitations": [ "…", "…" ]
}
```

### Impact score

```
score = vegetation (0-40)  +  water (0-40)  +  extent (0-20)        → 0-100
        land-only ΔNDVI       water gain as % of buffer   share improved
```

| Score | Confidence | Recommendation |
| :--- | :--- | :--- |
| ≥ 60 | High | Replicate the design |
| 45–60 | Moderate | Maintain and re-observe |
| 30–45 | Low-Moderate | Field inspection / desilt |
| < 30 | Inconclusive | Investigate siting or data |

---

## Photos — `/api/v1/photos`

| Method | Path | Key params | Returns |
| :--- | :--- | :--- | :--- |
| `GET` | `/photos` | `[watershed_id]`, `[intervention_id]`, `[status]`, `[has_gps]` | Photo records with binding + validation |
| `GET` | `/photos/stats` | `[watershed_id]` | Counts by validation status and flag |
| `GET` | `/photos/geojson` | `[watershed_id]` | Photo pins for the map |
| `GET` | `/photos/{id}` | — | Single record |
| `GET` | `/photos/{id}/interpretation` | — | Automated content interpretation + satellite cross-check |
| `POST` | `/photos/upload` | `multipart/form-data: files[]`, `[watershed_id]`, `[persist]` | Ingested records: EXIF → binding → validation → interpretation |
| `POST` | `/photos/revalidate` | `[watershed_id]` | Re-runs binding and validation over the index |

Validation flags: `MISSING_GPS`, `OUTSIDE_BUFFER`, `PRE_IMPLEMENTATION_BASELINE`,
`TIMESTAMP_PREDATES_STRUCTURE`, `DUPLICATE_LOCATION_WITH_<id>`, `BLURRED`, `UNDEREXPOSED`.

> Uploads are appended to `data/sample/metadata/photos.csv` only when
> `WS_PERSIST_UPLOADS` is truthy (tests disable it so the shipped dataset is never
> mutated).

---

## Analytics — `/api/v1/analytics`

| Method | Path | Key params | Returns |
| :--- | :--- | :--- | :--- |
| `GET` | `/analytics/{id}/change-detection` | `[t0]`, `[t1]`, `[index]` | Δ statistics, class histogram, area-weighted deltas |
| `GET` | `/analytics/{id}/hotspots` | `[t0]`, `[t1]`, `[top]` | Block-aggregated gainers and losers |
| `GET` | `/analytics/{id}/compare` | `epochs=a,b,c` | Cross-epoch comparison table |
| `GET` | `/analytics/{id}/epochs` | — | Acquisition list with dates and cloud cover |

---

## Reports — `/api/v1/reports`

| Method | Path | Key params | Returns |
| :--- | :--- | :--- | :--- |
| `GET` | `/reports` | — | Previously generated PDFs (filename, size, created) |
| `GET` | `/reports/{filename}` | — | Download |
| `POST` | `/reports/intervention/{id}` | `[radius_m]` | Generates the **PDF evidence pack** (4 pages) |
| `POST` | `/reports/watershed/{id}` | `[radius_m]` | Generates the **PDF micro-watershed assessment** (4 pages) |

Both responses return `{"filename": "…", "url": "/static/reports/…", "size_kb": …, "pages": 4}`.

### Evidence pack contents

1. **Cover** — identity block, location, buffer parameters, verification stamp.
2. **Location & context** — locator map, DEM hillshade with the 250 m buffer, site parameters.
3. **Satellite evidence** — NDVI T0/T1/Δ panels, land-only vs raw NDVI, seasonal response,
   LULC transition table, water-balance table.
4. **Photographic evidence** — geo-coded photographs with EXIF GPS/time, distance to
   structure, automated interpretation, satellite cross-check, then *Methodology &
   Limitations*.

The watershed assessment swaps pages 3–4 for watershed-wide indicator panels, the LULC
transition matrix, drainage/morphometry, the **full intervention ranking table**, hotspot
list and prioritised recommendations.

---

## Static assets

| Mount | Contents |
| :--- | :--- |
| `/static/photos/…` | Field photographs (originals, EXIF preserved) |
| `/static/satellite/…` | Quicklook composites per epoch |
| `/static/overlays/…` | Rendered raster overlays (PNG, alpha) |
| `/static/reports/…` | Generated PDFs |

---

## Errors

Standard FastAPI envelope: `{"detail": "…"}` with `404` (unknown id), `422` (bad query
parameter) or `500` (analysis failure, with the exception message). Every analysis
endpoint is defensive: if a raster or photograph is missing it degrades to `null` rather
than failing the whole request.
