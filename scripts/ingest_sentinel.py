"""
ingest_sentinel.py
==================
Real-data ingestion adapter for Watershed Insight (SIH PS26015).

The platform's analysis engine is deliberately NumPy-only so it can be deployed
on low-cost infrastructure.  This script is the *only* component that needs a
geospatial I/O stack: it turns public, authentication-free Earth-observation
products into exactly the on-disk contract the engine already consumes, and then
gets out of the way.

    Sentinel-2 L2A COGs  ─┐
    (AWS Open Data,       ├─►  bands.npz + manifest.json
     STAC search)         ─┘
    AWS Terrain Tiles     ───►  dem/<id>_dem.npz
    DEM-derived siting    ───►  interventions.geojson

Produced dataset layout (identical to the synthetic one)::

    <out>/
      catalog/watersheds.json
      boundaries/<id>.geojson
      dem/<id>_dem.npz                       {elevation, bounds}
      satellite/<id>/manifest.json
      satellite/<id>/<epoch>/bands.npz       {red, green, nir, swir, blue, bounds}
      interventions/interventions.geojson
      metadata/photos.csv                    (empty until field photos are supplied)

Design notes
------------
* **No authentication.**  Everything is read from AWS Open Data buckets via
  public HTTPS (STAC API + COG range requests).  No token, key or account.
* **Clouds are data, not decoration.**  The Sentinel-2 Scene Classification
  Layer (SCL) is used to mask cloud, cloud shadow, cirrus, saturation and
  no-data.  Masked pixels become NaN so they propagate as "no observation"
  through every statistic, and the *valid-pixel fraction* is persisted so the
  confidence score can account for it.
* **Reprojection happens here, not in the engine.**  Bands are warped to a
  fixed EPSG:4326 grid matching the DEM, so the engine's simple
  lat/lon <-> pixel algebra stays exact.

Usage
-----
    pip install -r requirements-optional.txt

    # Ralegaon Siddhi, Parner taluka, Ahmednagar district, Maharashtra
    python scripts/ingest_sentinel.py --out data/real --site-candidates 6

    # any other AOI
    python scripts/ingest_sentinel.py --lat 19.2247 --lon 74.6333 \
        --size-deg 0.025 --out data/real --site-candidates 6

    # then point the platform at it
    WS_DATA_DIR=data/real python -m uvicorn backend.app.main:app
"""

from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import sys
import tempfile
import time
import urllib.request
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# --------------------------------------------------------------------------- #
# Sources (all public, no authentication)
# --------------------------------------------------------------------------- #
STAC_URL = "https://earth-search.aws.element84.com/v1"
COLLECTION = "sentinel-2-l2a"

# Band name used by the engine -> Sentinel-2 asset key.
BAND_ASSETS = {
    "blue": "blue",     # B02, 10 m
    "green": "green",   # B03, 10 m
    "red": "red",       # B04, 10 m
    "nir": "nir",       # B08, 10 m
    "swir": "swir16",   # B11, 20 m
}
SCL_ASSET = "scl"       # Scene Classification Layer, 20 m

# SCL classes that must NOT be interpreted as land surface.
INVALID_SCL = {0, 1, 3, 8, 9, 10}   # nodata, saturated, shadow, cloud med/hi, cirrus
SCL_LABELS = {
    0: "no data", 1: "saturated / defective", 2: "dark area", 3: "cloud shadow",
    4: "vegetation", 5: "not vegetated", 6: "water", 7: "unclassified",
    8: "cloud medium probability", 9: "cloud high probability",
    10: "thin cirrus", 11: "snow / ice",
}

TERRAIN_TILE_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
TERRAIN_ZOOM = 14           # ~9 m/px at this latitude (source data is ~30 m)
WEB_MERCATOR_EXTENT = 20037508.342789244

# Default AOI: Ralegaon Siddhi (Parner taluka, Ahmednagar district, Maharashtra)
# - the most cited village-level watershed-development case in India, which makes
#   it the natural first real-world validation AOI for PS26015.
DEFAULT_LAT = 19.2247
DEFAULT_LON = 74.6333
DEFAULT_SIZE_DEG = 0.025     # ~2.7 km  ->  ~730 ha, micro-watershed scale
DEFAULT_PIXEL_DEG = 0.0001   # ~11 m    ->  250 x 250 grid

# Season-matched acquisition windows (pre-monsoon / post-monsoon pairs).
DEFAULT_WINDOWS: List[Tuple[str, str, str, str]] = [
    ("2024-05-01", "2024-05-31", "T0", "Pre-monsoon"),
    ("2024-10-15", "2024-11-30", "intermediate", "Post-monsoon"),
    ("2025-04-15", "2025-05-31", "intermediate", "Pre-monsoon"),
    ("2025-10-15", "2025-11-30", "intermediate", "Post-monsoon"),
    ("2026-04-15", "2026-05-31", "T1", "Pre-monsoon"),
    ("2026-09-01", "2026-09-19", "intermediate", "Monsoon"),
]


def log(msg: str) -> None:
    print(f"[ingest] {msg}", flush=True)


# --------------------------------------------------------------------------- #
# GDAL / rasterio environment for remote COG access
# --------------------------------------------------------------------------- #
def configure_gdal() -> None:
    for key, value in {
        "GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR",
        "AWS_NO_SIGN_REQUEST": "YES",
        "GDAL_HTTP_MAX_RETRY": "6",
        "GDAL_HTTP_RETRY_DELAY": "3",
        "GDAL_HTTP_TIMEOUT": "180",
        "VSI_CACHE": "TRUE",
        "CPL_VSIL_CURL_ALLOWED_EXTENSIONS": ".tif,.TIF",
    }.items():
        os.environ.setdefault(key, value)


def require_optional_deps() -> None:
    missing = []
    try:
        import rasterio  # noqa: F401
    except ImportError:
        missing.append("rasterio")
    try:
        import pystac_client  # noqa: F401
    except ImportError:
        missing.append("pystac-client")
    if missing:
        raise SystemExit(
            "Real-data ingestion needs optional dependencies.\n"
            "    pip install -r requirements-optional.txt\n"
            f"    (missing: {', '.join(missing)})"
        )


# --------------------------------------------------------------------------- #
# Target grid
# --------------------------------------------------------------------------- #
@dataclass
class Grid:
    """Fixed EPSG:4326 analysis grid shared by every band and the DEM."""
    west: float
    south: float
    east: float
    north: float
    width: int
    height: int

    @property
    def bounds(self) -> List[float]:
        return [self.west, self.south, self.east, self.north]

    @property
    def transform(self):
        from rasterio.transform import from_bounds
        return from_bounds(self.west, self.south, self.east, self.north,
                           self.width, self.height)

    def describe(self) -> str:
        return (f"{self.width}x{self.height} px  "
                f"({self.east - self.west:.4f} x {self.north - self.south:.4f} deg)")


# --------------------------------------------------------------------------- #
# STAC search
# --------------------------------------------------------------------------- #
def search_scenes(bbox: Sequence[float],
                  windows: Sequence[Tuple[str, str, str, str]],
                  max_cloud: float = 20.0) -> List[dict]:
    """Pick the least-cloudy Sentinel-2 L2A scene inside each date window."""
    from pystac_client import Client

    catalogue = Client.open(STAC_URL)
    picks: List[dict] = []

    for start, end, role, season in windows:
        search = catalogue.search(
            collections=[COLLECTION],
            bbox=list(bbox),
            datetime=f"{start}/{end}",
            query={"eo:cloud_cover": {"lt": max_cloud}},
            sortby=[{"field": "properties.eo:cloud_cover", "direction": "asc"}],
        )
        items = list(search.items())
        if not items:
            log(f"  ! no scene < {max_cloud}% cloud for {start}..{end} - widening to 60%")
            search = catalogue.search(
                collections=[COLLECTION], bbox=list(bbox), datetime=f"{start}/{end}",
                query={"eo:cloud_cover": {"lt": 60}},
                sortby=[{"field": "properties.eo:cloud_cover", "direction": "asc"}])
            items = list(search.items())
        if not items:
            log(f"  ! no scene at all for {start}..{end} - skipped")
            continue

        item = items[0]
        date = item.datetime.date().isoformat()
        cloud = float(item.properties.get("eo:cloud_cover", 0.0) or 0.0)
        picks.append({
            "item": item,
            "key": f"{date}_{role}",
            "date": date,
            "role": role,
            "season": season,
            "cloud_cover_pct": round(cloud, 2),
            "tile": item.properties.get("grid:code", "?"),
            "platform": item.properties.get("platform", "sentinel-2"),
            "candidates": len(items),
        })
        log(f"  + {date}  {season:<13} cloud={cloud:5.2f}%  "
            f"tile={item.properties.get('grid:code', '?')}  ({len(items)} candidates)")
    return picks


# --------------------------------------------------------------------------- #
# Band reading / warping
# --------------------------------------------------------------------------- #
def _read_window(href: str, grid: Grid, resampling, nodata=np.nan) -> np.ndarray:
    """Read one COG band and warp it onto the fixed analysis grid."""
    import rasterio
    from rasterio.windows import from_bounds, transform as window_transform
    from rasterio.warp import reproject, transform_bounds

    with rasterio.open(href) as src:
        src_bounds = transform_bounds("EPSG:4326", src.crs, *grid.bounds, densify_pts=21)
        window = from_bounds(*src_bounds, transform=src.transform).round_offsets().round_lengths()
        # grow by 3 px so the resampling kernel has neighbours at the edges
        from rasterio.windows import Window
        window = Window(max(0, window.col_off - 3), max(0, window.row_off - 3),
                        window.width + 6, window.height + 6)
        raw = src.read(1, window=window, boundless=True, fill_value=0)
        win_tf = window_transform(window, src.transform)
        src_crs = src.crs

    dst = np.full((grid.height, grid.width), np.nan, dtype="float32")
    reproject(
        source=raw, destination=dst,
        src_transform=win_tf, src_crs=src_crs,
        dst_transform=grid.transform, dst_crs="EPSG:4326",
        resampling=resampling, src_nodata=0, dst_nodata=np.nan,
    )
    return dst


def read_bands(item, grid: Grid, progress=None) -> Tuple[Dict[str, np.ndarray], Optional[np.ndarray]]:
    """Read every required band plus the SCL cloud mask."""
    from rasterio.enums import Resampling

    bands: Dict[str, np.ndarray] = {}
    for name, asset_key in BAND_ASSETS.items():
        asset = item.assets.get(asset_key)
        if asset is None:
            log(f"    ! asset '{asset_key}' missing - band '{name}' unavailable")
            continue
        for attempt in range(3):
            try:
                arr = _read_window(asset.href, grid, Resampling.bilinear)
                break
            except Exception as exc:                      # pragma: no cover - network
                if attempt == 2:
                    raise
                log(f"    ! retry {attempt + 1}/3 for {asset_key}: {exc}")
                time.sleep(3 * (attempt + 1))

        # Sentinel-2 L2A reflectance is stored as DN scaled by 10000.
        finite = arr[np.isfinite(arr)]
        if finite.size and np.nanpercentile(finite, 99) > 5.0:
            arr = arr / 10000.0
        arr = np.clip(arr, 0.0, 1.0)
        arr[~np.isfinite(arr)] = np.nan
        bands[name] = arr.astype("float32")
        if progress:
            progress(name)

    # --- cloud / shadow mask from the Scene Classification Layer ---------- #
    scl = None
    scl_asset = item.assets.get(SCL_ASSET)
    if scl_asset is not None:
        try:
            from rasterio.enums import Resampling
            scl_raw = _read_window(scl_asset.href, grid, Resampling.nearest)
            scl = np.where(np.isfinite(scl_raw), np.rint(scl_raw), 0).astype("uint8")
        except Exception as exc:                          # pragma: no cover - network
            log(f"    ! SCL unavailable ({exc}) - cloud masking skipped")
    return bands, scl


def apply_cloud_mask(bands: Dict[str, np.ndarray], scl: Optional[np.ndarray]) -> float:
    """NaN-out cloud / shadow / cirrus / saturated pixels.  Returns valid fraction."""
    if scl is None:
        finite = np.isfinite(next(iter(bands.values())))
        return float(finite.mean())
    invalid = np.isin(scl, list(INVALID_SCL)) | ~np.isfinite(next(iter(bands.values())))
    for name in bands:
        bands[name] = np.where(invalid, np.nan, bands[name])
    return float(1.0 - invalid.mean())


# --------------------------------------------------------------------------- #
# DEM from AWS Terrain Tiles (terrarium encoding)
# --------------------------------------------------------------------------- #
def _tile_xy(lat: float, lon: float, z: int) -> Tuple[int, int]:
    n = 2 ** z
    x = int((lon + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    y = int((1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad)) / math.pi) / 2.0 * n)
    return min(max(x, 0), n - 1), min(max(y, 0), n - 1)


def _lonlat_to_mercator(lon: np.ndarray, lat: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    x = lon * WEB_MERCATOR_EXTENT / 180.0
    y = np.log(np.tan((90.0 + lat) * math.pi / 360.0)) / (math.pi / 180.0)
    y = y * WEB_MERCATOR_EXTENT / 180.0
    return x, y


def _fetch_tile(z: int, x: int, y: int, cache_dir: str):
    from PIL import Image

    path = os.path.join(cache_dir, f"{z}_{x}_{y}.png")
    if not os.path.exists(path):
        url = TERRAIN_TILE_URL.format(z=z, x=x, y=y)
        req = urllib.request.Request(url, headers={"User-Agent": "watershed-insight/1.0"})
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=60) as resp, open(path, "wb") as fh:
                    shutil.copyfileobj(resp, fh)
                break
            except Exception as exc:                      # pragma: no cover - network
                if attempt == 2:
                    raise
                time.sleep(2 * (attempt + 1))
    with Image.open(path) as img:
        rgb = np.asarray(img.convert("RGB")).astype("float64")
    # terrarium: elevation = (R * 256 + G + B / 256) - 32768
    return (rgb[:, :, 0] * 256.0 + rgb[:, :, 1] + rgb[:, :, 2] / 256.0) - 32768.0


def _bilinear(arr: np.ndarray, xs: np.ndarray, ys: np.ndarray) -> np.ndarray:
    x0 = np.clip(np.floor(xs).astype(int), 0, arr.shape[1] - 1)
    y0 = np.clip(np.floor(ys).astype(int), 0, arr.shape[0] - 1)
    x1 = np.clip(x0 + 1, 0, arr.shape[1] - 1)
    y1 = np.clip(y0 + 1, 0, arr.shape[0] - 1)
    dx = xs - x0
    dy = ys - y0
    return (arr[y0, x0] * (1 - dx) * (1 - dy) + arr[y0, x1] * dx * (1 - dy)
            + arr[y1, x0] * (1 - dx) * dy + arr[y1, x1] * dx * dy)


def fetch_dem(grid: Grid, zoom: int = TERRAIN_ZOOM) -> np.ndarray:
    """Mosaic terrarium tiles covering the AOI and resample onto ``grid``."""
    x0, y1 = _tile_xy(grid.south, grid.west, zoom)
    x1, y0 = _tile_xy(grid.north, grid.east, zoom)
    log(f"  DEM tiles z{zoom}: x {x0}..{x1}, y {y0}..{y1} "
        f"({(x1 - x0 + 1) * (y1 - y0 + 1)} tiles)")

    cache_dir = tempfile.mkdtemp(prefix="ws-terrain-")
    try:
        tile_size = 2 * WEB_MERCATOR_EXTENT / (2 ** zoom)
        mosaic_w = (x1 - x0 + 1) * 256
        mosaic_h = (y1 - y0 + 1) * 256
        mosaic = np.full((mosaic_h, mosaic_w), np.nan, dtype="float64")
        origin_x = -WEB_MERCATOR_EXTENT + x0 * tile_size
        origin_y = WEB_MERCATOR_EXTENT - y0 * tile_size

        for ty in range(y0, y1 + 1):
            for tx in range(x0, x1 + 1):
                elev = _fetch_tile(zoom, tx, ty, cache_dir)
                mosaic[(ty - y0) * 256:(ty - y0 + 1) * 256,
                       (tx - x0) * 256:(tx - x0 + 1) * 256] = elev
    finally:
        shutil.rmtree(cache_dir, ignore_errors=True)

    # target cell centres -> mercator -> mosaic pixel coords
    lons = grid.west + (np.arange(grid.width) + 0.5) * (grid.east - grid.west) / grid.width
    lats = grid.north - (np.arange(grid.height) + 0.5) * (grid.north - grid.south) / grid.height
    lon2d, lat2d = np.meshgrid(lons, lats)
    mx, my = _lonlat_to_mercator(lon2d, lat2d)
    px = (mx - origin_x) / tile_size * 256.0 - 0.5
    py = (origin_y - my) / tile_size * 256.0 - 0.5

    dem = _bilinear(mosaic, px, py).astype("float32")
    bad = ~np.isfinite(dem)
    if bad.any():                       # nearest-neighbour backfill for tile gaps
        dem[bad] = np.nanmedian(dem[np.isfinite(dem)]) if np.isfinite(dem).any() else 0.0
    log(f"  DEM relief {dem.min():.1f} - {dem.max():.1f} m "
        f"(mean {dem.mean():.1f} m, {zoom}-zoom terrain tiles, ~30 m source)")
    return dem


# --------------------------------------------------------------------------- #
# Dataset writers
# --------------------------------------------------------------------------- #
def write_dataset(out_dir: str, watershed_id: str, meta: dict, grid: Grid,
                  epochs: List[dict], dem: np.ndarray,
                  interventions: List[dict]) -> None:
    for sub in ("catalog", "boundaries", "dem", "interventions", "metadata", "photos"):
        os.makedirs(os.path.join(out_dir, sub), exist_ok=True)

    # --- DEM ------------------------------------------------------------- #
    np.savez_compressed(os.path.join(out_dir, "dem", f"{watershed_id}_dem.npz"),
                        elevation=dem.astype("float32"),
                        bounds=np.array(grid.bounds, dtype="float64"))

    # --- satellite stacks -------------------------------------------------- #
    sat_dir = os.path.join(out_dir, "satellite", watershed_id)
    manifest = {"generated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
                "problem_statement": "SIH PS26015",
                "source": "Sentinel-2 L2A COGs (AWS Open Data) via STAC",
                "stac_endpoint": STAC_URL,
                "collection": COLLECTION,
                "cloud_mask": "Sentinel-2 Scene Classification Layer "
                              f"({'|'.join(str(c) for c in sorted(INVALID_SCL))} masked)",
                "note": "Real Earth-observation data. Bands are surface reflectance "
                        "in [0, 1]; masked pixels are NaN.",
                "epochs": []}

    for epoch in epochs:
        key = epoch["key"]
        epoch_dir = os.path.join(sat_dir, key)
        os.makedirs(epoch_dir, exist_ok=True)
        payload = {name: arr for name, arr in epoch["bands"].items()}
        payload["bounds"] = np.array(grid.bounds, dtype="float64")
        np.savez_compressed(os.path.join(epoch_dir, "bands.npz"), **payload)

        manifest["epochs"].append({
            "key": key,
            "date": epoch["date"],
            "label": f"{epoch['season']} {epoch['date'][:4]}",
            "role": epoch["role"],
            "season": epoch["season"],
            "cloud_cover_pct": epoch["cloud_cover_pct"],
            "valid_pixel_fraction": round(epoch["valid_fraction"], 4),
            "sensor": f"Sentinel-2 MSI (L2A) - {epoch['platform'].upper()} "
                      f"tile {epoch['tile']}",
            "scene_id": epoch["item"].id,
            "product": epoch["item"].id,
        })
    with open(os.path.join(sat_dir, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)

    # --- boundary (rectangular analysis window, stated honestly) ---------- #
    ring = [[grid.west, grid.south], [grid.east, grid.south],
            [grid.east, grid.north], [grid.west, grid.north], [grid.west, grid.south]]
    boundary = {
        "type": "Feature",
        "properties": {"id": watershed_id, "code": meta["code"], "name": meta["name"],
                       "area_ha": meta["area_ha"],
                       "geometry_note": "Rectangular analysis window over the AOI "
                                        "(not a surveyed micro-watershed boundary)."},
        "geometry": {"type": "Polygon", "coordinates": [ring]},
    }
    with open(os.path.join(out_dir, "boundaries", f"{watershed_id}.geojson"), "w",
              encoding="utf-8") as fh:
        json.dump(boundary, fh, indent=2)

    # --- interventions ---------------------------------------------------- #
    fc = {"type": "FeatureCollection", "features": [
        {"type": "Feature",
         "properties": item,
         "geometry": {"type": "Point", "coordinates": [item["longitude"], item["latitude"]]}}
        for item in interventions]}
    with open(os.path.join(out_dir, "interventions", "interventions.geojson"), "w",
              encoding="utf-8") as fh:
        json.dump(fc, fh, indent=2)

    # --- catalog ---------------------------------------------------------- #
    catalog = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "problem_statement": "SIH PS26015",
        "note": "REAL EO DATASET - Sentinel-2 L2A (AWS Open Data) + terrain-tile DEM. "
                "Interventions are DEM-sited candidates pending field verification.",
        "real_data": True,
        "hierarchy": [{
            "code": meta["state_code"], "name": meta["state"], "districts": [{
                "code": meta["district_code"], "name": meta["district"], "blocks": [{
                    "code": meta["block_code"], "name": meta["block"], "watersheds": [{
                        "id": watershed_id, "code": meta["code"], "name": meta["name"],
                        "area_ha": meta["area_ha"], "interventions": len(interventions),
                    }]}]}]}],
        "watersheds": {watershed_id: meta},
    }
    with open(os.path.join(out_dir, "catalog", "watersheds.json"), "w", encoding="utf-8") as fh:
        json.dump(catalog, fh, indent=2)

    # --- empty photo index (field photographs are supplied by DRISHTI) ---- #
    photos_csv = os.path.join(out_dir, "metadata", "photos.csv")
    if not os.path.exists(photos_csv):
        with open(photos_csv, "w", encoding="utf-8") as fh:
            fh.write("file_name,intervention_id,captured_on,latitude,longitude,"
                     "watershed_id,description\n")
    log(f"  dataset written -> {out_dir}")


# --------------------------------------------------------------------------- #
# DEM-derived intervention siting (candidates, not field-confirmed)
# --------------------------------------------------------------------------- #
# Indicative unit costs (IWMP / MGNREGA schedule-of-rates order of magnitude).
UNIT_COST_INR = {
    "Masonry Check Dam": 320_000,
    "Percolation Tank": 480_000,
    "Farm Pond (lined)": 185_000,
    "Continuous Contour Bund": 96_000,
    "Gully Plug / Nala Bund": 74_000,
    "Horti-Afforestation": 125_000,
}


def site_candidates(out_dir: str, watershed_id: str, count: int,
                    stream_threshold: int = 220) -> List[dict]:
    """
    Place candidate structure sites on the *real* DEM-derived stream network.

    These are NOT surveyed structures: they are where standard IWMP siting
    practice would put a structure, computed from terrain alone, and they are
    labelled as such throughout the platform.  Replacing
    ``interventions.geojson`` with a district's real inventory is a data
    substitution, not a code change.
    """
    from geospatial.hydrology import build_terrain_model

    terrain = build_terrain_model(watershed_id=watershed_id, data_dir=out_dir,
                                  stream_threshold=stream_threshold)
    streams = terrain.streams.astype(bool)
    order = terrain.order
    accumulation = terrain.flow_acc_cells
    grid = terrain.grid

    if not streams.any():
        log("  ! no stream network extracted - skipping siting")
        return []

    cell_m = grid.dx * 111_320.0 * math.cos(math.radians(
        (grid.max_lat + grid.min_lat) / 2.0))
    min_separation_px = max(4, int(round(250.0 / cell_m)))

    # Stratify by Strahler order: real watershed treatment places different
    # structures on different orders (gully plugs on 1st, check dams on 2nd,
    # tanks on 3rd+), so take at least one candidate per available order before
    # filling the remainder round-robin.
    orders_present = sorted({int(v) for v in np.unique(order[streams])}, reverse=True)
    pools = {}
    for o in orders_present:
        ys, xs = np.nonzero(streams & (order == o))
        idx = np.argsort(-accumulation[ys, xs].astype("float64"))
        pools[o] = [(int(ys[i]), int(xs[i])) for i in idx]

    chosen: List[Tuple[int, int]] = []

    def _far_enough(y: int, x: int) -> bool:
        return all(abs(y - cy) > min_separation_px or abs(x - cx) > min_separation_px
                   for cy, cx in chosen)

    round_no = 0
    while len(chosen) < count:
        progressed = False
        for o in orders_present:
            if len(chosen) >= count:
                break
            pool = pools[o]
            taken = None
            for pos, (y, x) in enumerate(pool):
                if _far_enough(y, x):
                    taken = pos
                    break
            if taken is not None:
                chosen.append(pool.pop(taken))
                progressed = True
        if not progressed:
            break
        round_no += 1
        if round_no > count:
            break

    # Type follows stream order, as in standard watershed-treatment planning.
    by_order = {1: "Gully Plug / Nala Bund", 2: "Masonry Check Dam",
                3: "Percolation Tank", 4: "Percolation Tank", 5: "Percolation Tank"}
    rows: List[dict] = []
    for i, (y, x) in enumerate(chosen, start=1):
        lat = float(grid.lat_of(y))
        lon = float(grid.lon_of(x))
        sorder = int(order[y, x])
        kind = by_order.get(min(sorder, 5), "Masonry Check Dam")
        rows.append({
            "id": f"CAN-{i:03d}",
            "code": f"CAND-{i:03d}",
            "name": f"{kind} candidate #{i:03d}",
            "type": kind,
            "watershed_id": watershed_id,
            "latitude": round(lat, 6),
            "longitude": round(lon, 6),
            "stream_order": sorder,
            "catchment_cells": int(accumulation[y, x]),
            "cost_inr": UNIT_COST_INR.get(kind, 150_000),
            "status": "Siting candidate (not field-verified)",
            "verified": False,
            "source": "DEM-derived hydrological siting",
            "geometry_note": "Location computed from the real DEM stream network; "
                             "requires ground confirmation before use as evidence.",
        })
    log(f"  {len(rows)} DEM-sited candidates on the real stream network "
        f"(orders {sorted({r['stream_order'] for r in rows})})")
    return rows


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--lat", type=float, default=DEFAULT_LAT)
    p.add_argument("--lon", type=float, default=DEFAULT_LON)
    p.add_argument("--size-deg", type=float, default=DEFAULT_SIZE_DEG)
    p.add_argument("--pixel-deg", type=float, default=DEFAULT_PIXEL_DEG)
    p.add_argument("--out", default="data/real")
    p.add_argument("--watershed-id", default="real_rs_001")
    p.add_argument("--name", default="Ralegaon Siddhi Micro-Watershed Window")
    p.add_argument("--code", default="MWS-MH-RALEGAON-001")
    p.add_argument("--state", default="Maharashtra")
    p.add_argument("--district", default="Ahmednagar")
    p.add_argument("--block", default="Parner")
    p.add_argument("--village", default="Ralegaon Siddhi")
    p.add_argument("--max-cloud", type=float, default=20.0)
    p.add_argument("--site-candidates", type=int, default=0,
                   help="Derive N DEM-sited candidate structure locations")
    p.add_argument("--stream-threshold", type=int, default=220,
                   help="Flow-accumulation cells required to call a cell a stream")
    p.add_argument("--no-dem", action="store_true", help="Skip DEM download (reuse existing)")
    p.add_argument("--dry-run", action="store_true", help="Search only, download nothing")
    return p.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    require_optional_deps()
    configure_gdal()

    half = args.size_deg / 2.0
    grid = Grid(west=args.lon - half, south=args.lat - half,
                east=args.lon + half, north=args.lat + half,
                width=int(round(args.size_deg / args.pixel_deg)),
                height=int(round(args.size_deg / args.pixel_deg)))
    bbox = [grid.west, grid.south, grid.east, grid.north]

    area_ha = ((grid.east - grid.west) * 111_320.0 * math.cos(math.radians(args.lat))
               * (grid.north - grid.south) * 110_574.0) / 10_000.0

    log(f"AOI  {args.village}, {args.block}, {args.district}, {args.state}")
    log(f"     centre {args.lat:.5f}, {args.lon:.5f}  bbox {[round(v, 5) for v in bbox]}  "
        f"~{area_ha:.0f} ha")
    log(f"Grid {grid.describe()}")

    log("Searching STAC for season-matched Sentinel-2 L2A scenes ...")
    picks = search_scenes(bbox, DEFAULT_WINDOWS, args.max_cloud)
    if not picks:
        log("No scenes found - aborting.")
        return 1
    if args.dry_run:
        log("--dry-run: nothing downloaded.")
        return 0

    os.makedirs(args.out, exist_ok=True)

    epochs: List[dict] = []
    for pick in picks:
        log(f"Fetching {pick['date']} ({pick['tile']}) ...")
        bands, scl = read_bands(pick["item"], grid)
        if len(bands) < 4:
            log(f"  ! only {len(bands)} bands - epoch skipped")
            continue
        valid_fraction = apply_cloud_mask(bands, scl)
        log(f"  bands {sorted(bands)}  valid pixels {valid_fraction * 100:.2f}%")
        pick["bands"] = bands
        pick["valid_fraction"] = valid_fraction
        epochs.append(pick)

    if not epochs:
        log("No usable epochs - aborting.")
        return 1

    dem_path = os.path.join(args.out, "dem", f"{args.watershed_id}_dem.npz")
    if args.no_dem and os.path.exists(dem_path):
        dem = np.load(dem_path)["elevation"].astype("float32")
        log(f"DEM reused from {dem_path}")
    else:
        log("Fetching terrain-tile DEM ...")
        dem = fetch_dem(grid)
        os.makedirs(os.path.join(args.out, "dem"), exist_ok=True)
        np.savez_compressed(dem_path, elevation=dem.astype("float32"),
                            bounds=np.array(grid.bounds, dtype="float64"))

    meta = {
        "id": args.watershed_id, "code": args.code, "name": args.name,
        "state": args.state, "state_code": "MH",
        "district": args.district, "district_code": "MH-AN",
        "block": args.block, "block_code": "MH-AN-PNR",
        "project": "PMKSY-WDC 2.0 (real-data validation AOI)",
        "village": args.village,
        "rainfall_mm": 560,
        "soil": "Medium black / shallow basaltic (Deccan traps)",
        "aquifer": "Deccan basalt - weathered / fractured",
        "population": None, "households": None,
        "area_ha": round(area_ha, 2),
        "centre": [args.lat, args.lon],
        "bounds": grid.bounds,
        "real_data": True,
        "data_sources": {
            "satellite": "Sentinel-2 MSI L2A (AWS Open Data / Earth Search STAC)",
            "dem": "AWS Terrain Tiles (terrarium, ~30 m source)",
            "interventions": "DEM-derived siting candidates (not field-verified)"
            if args.site_candidates else "not supplied",
        },
    }

    interventions: List[dict] = []
    if args.site_candidates:
        # DEM + catalog must exist before hydrology can run.
        write_dataset(args.out, args.watershed_id, meta, grid, epochs, dem, [])
        log("Deriving DEM-sited candidate structure locations ...")
        interventions = site_candidates(args.out, args.watershed_id, args.site_candidates,
                                        args.stream_threshold)

    write_dataset(args.out, args.watershed_id, meta, grid, epochs, dem, interventions)

    log("Done.")
    log(f"  {len(epochs)} real Sentinel-2 epochs, {len(interventions)} candidate sites")
    log(f"  Point the platform at it:  WS_DATA_DIR={args.out} "
        f"python -m uvicorn backend.app.main:app")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
