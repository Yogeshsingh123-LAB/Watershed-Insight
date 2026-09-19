"""
hydrology.py
============
Terrain and drainage analytics for micro-watershed planning.

Given a DEM (digital elevation model) the module derives the products that a
watershed planner needs, using only NumPy primitives:

1. **Sink filling** (priority-flood) - removes spurious depressions so flow
   routing is hydrologically correct.
2. **D8 flow direction + flow accumulation** - where does water converge?
3. **Stream network extraction + Strahler ordering** - the drainage map product.
4. **Catchment delineation** - every pixel draining to a chosen pour point
   (used to justify *why* a structure was sited where it was).
5. **Slope, aspect, topographic wetness index (TWI)** - erosion risk and
   site-suitability inputs.
6. **Morphometry** - drainage density, stream frequency, form factor and
   elongation ratio: the quantitative parameters quoted in IWMP DPRs.

Outputs are NumPy arrays + GeoJSON, so they can be shipped straight to Leaflet.
"""

from __future__ import annotations

import heapq
import math
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

from .geo_utils import RasterGrid, metres_per_degree, safe_div

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data", "sample")

# D8 neighbour offsets: (drow, dcol, direction code)
D8_OFFSETS = [
    (-1, 0, 1), (-1, 1, 2), (0, 1, 3), (1, 1, 4),
    (1, 0, 5), (1, -1, 6), (0, -1, 7), (-1, -1, 8),
]

DEFAULT_STREAM_THRESHOLD = 220  # contributing cells (~2.2 ha) required to call it a stream


@dataclass
class TerrainModel:
    """Container for the DEM and everything derived from it."""
    dem: np.ndarray                       # raw elevation (m)
    filled: np.ndarray                    # hydrologically conditioned DEM
    grid: RasterGrid
    flow_dir: np.ndarray
    flow_acc_cells: np.ndarray
    flow_acc_area_m2: np.ndarray
    slope_pct: np.ndarray
    aspect: np.ndarray
    twi: np.ndarray
    streams: np.ndarray
    order: np.ndarray
    stats: Dict[str, float] = field(default_factory=dict)

    def cell_size_m(self) -> Tuple[float, float]:
        return self._cell_x, self._cell_y


# --------------------------------------------------------------------------- #
# DEM loading
# --------------------------------------------------------------------------- #
def load_dem(watershed_id: str = "watershed_001",
             data_dir: str = DATA_DIR) -> Tuple[np.ndarray, RasterGrid]:
    path = os.path.join(data_dir, "dem", f"{watershed_id}_dem.npz")
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"DEM not found at {path}. Run: python scripts/generate_sample_data.py"
        )
    data = np.load(path)
    dem = data["elevation"].astype("float32")
    bounds = [float(v) for v in data["bounds"]]
    return dem, RasterGrid(bounds, *dem.shape)


def _cell_sizes(grid: RasterGrid) -> Tuple[float, float]:
    """Ground size of one pixel in metres (x, y) at the raster centre latitude."""
    lat_mid = (grid.min_lat + grid.max_lat) / 2.0
    m_per_deg_lng, m_per_deg_lat = metres_per_degree(lat_mid)
    return grid.dx * m_per_deg_lng, grid.dy * m_per_deg_lat


def _shifted(src: np.ndarray, dr: int, dc: int, fill=np.nan) -> np.ndarray:
    """Array shifted so ``out[r, c] == src[r + dr, c + dc]`` (out of bounds -> NaN)."""
    h, w = src.shape
    out = np.full((h, w), fill, dtype="float64")
    r_src0, r_src1 = max(0, -dr), h - max(0, dr)
    c_src0, c_src1 = max(0, -dc), w - max(0, dc)
    r_dst0, r_dst1 = max(0, dr), h - max(0, -dr)
    c_dst0, c_dst1 = max(0, dc), w - max(0, -dc)
    out[r_src0:r_src1, c_src0:c_src1] = src[r_dst0:r_dst1, c_dst0:c_dst1]
    return out


# --------------------------------------------------------------------------- #
# 1. Sink filling (priority-flood, Barnes et al. 2014 - heap based)
# --------------------------------------------------------------------------- #
def fill_sinks(dem: np.ndarray, epsilon: float = 1e-4) -> np.ndarray:
    """Return a depression-free DEM so every cell has a downhill path to the edge."""
    dem = dem.astype("float64")
    filled = dem.copy()
    visited = np.zeros(dem.shape, dtype=bool)
    h, w = dem.shape
    heap: List[Tuple[float, int, int]] = []

    for c in range(w):
        for r in (0, h - 1):
            if not visited[r, c]:
                visited[r, c] = True
                heapq.heappush(heap, (filled[r, c], r, c))
    for r in range(h):
        for c in (0, w - 1):
            if not visited[r, c]:
                visited[r, c] = True
                heapq.heappush(heap, (filled[r, c], r, c))

    while heap:
        elev, r, c = heapq.heappop(heap)
        for dr, dc, _code in D8_OFFSETS:
            nr, nc = r + dr, c + dc
            if 0 <= nr < h and 0 <= nc < w and not visited[nr, nc]:
                if filled[nr, nc] <= elev:
                    filled[nr, nc] = elev + epsilon
                visited[nr, nc] = True
                heapq.heappush(heap, (filled[nr, nc], nr, nc))
    return filled.astype("float32")


# --------------------------------------------------------------------------- #
# 2. D8 flow direction & flow accumulation
# --------------------------------------------------------------------------- #
def flow_direction_d8(filled: np.ndarray, grid: RasterGrid) -> np.ndarray:
    """Steepest-descent (D8) flow-direction codes 1..8; 0 = flat / outlet."""
    h, w = filled.shape
    cell_x, cell_y = _cell_sizes(grid)
    best_slope = np.zeros((h, w), dtype="float64")
    fdir = np.zeros((h, w), dtype="uint8")

    for dr, dc, code in D8_OFFSETS:
        neighbour = _shifted(filled.astype("float64"), dr, dc)
        ground = math.hypot(dc * cell_x, dr * cell_y)
        slope = (filled.astype("float64") - neighbour) / ground
        slope = np.where(np.isfinite(slope), slope, 0.0)
        better = slope > best_slope
        fdir = np.where(better, np.uint8(code), fdir)
        best_slope = np.where(better, slope, best_slope)
    return fdir


def _offset_for_code(code: int) -> Tuple[int, int]:
    for dr, dc, c in D8_OFFSETS:
        if c == code:
            return dr, dc
    return 0, 0


def _reverse_adjacency(fdir: np.ndarray) -> Dict[int, List[int]]:
    """Map cell index -> list of upstream (donor) cell indices."""
    h, w = fdir.shape
    donors: Dict[int, List[int]] = {}
    for dr, dc, code in D8_OFFSETS:
        rr, cc = np.nonzero(fdir == code)
        for r, c in zip(rr, cc):
            nr, nc = int(r) + dr, int(c) + dc
            if 0 <= nr < h and 0 <= nc < w:
                donors.setdefault(nr * w + nc, []).append(int(r) * w + int(c))
    return donors


def flow_accumulation(fdir: np.ndarray, weights: Optional[np.ndarray] = None
                      ) -> np.ndarray:
    """
    D8 flow accumulation: number (or weighted mass) of upslope cells draining
    through each cell.

    Implemented as an iterative topological sweep (high -> low) so it scales to
    full watershed rasters without hitting Python's recursion limit.
    """
    h, w = fdir.shape
    weight = np.ones((h, w), dtype="float64") if weights is None else weights.astype("float64")
    donors = _reverse_adjacency(fdir)

    indeg = np.zeros(h * w, dtype="int64")
    for target, srcs in donors.items():
        indeg[target] += len(srcs)

    acc = weight.ravel().copy()
    queue = [int(i) for i in np.nonzero(indeg == 0)[0]]
    while queue:
        idx = queue.pop()
        r, c = divmod(idx, w)
        code = int(fdir[r, c])
        if code == 0:
            continue
        dr, dc = _offset_for_code(code)
        nr, nc = r + dr, c + dc
        if not (0 <= nr < h and 0 <= nc < w):
            continue
        nidx = nr * w + nc
        acc[nidx] += acc[idx]
        indeg[nidx] -= 1
        if indeg[nidx] == 0:
            queue.append(nidx)
    return acc.reshape(h, w)


# --------------------------------------------------------------------------- #
# 3. Stream extraction & Strahler ordering
# --------------------------------------------------------------------------- #
def extract_streams(flow_acc_cells: np.ndarray,
                    threshold: int = DEFAULT_STREAM_THRESHOLD) -> np.ndarray:
    """Boolean stream mask from a contributing-area threshold (in cells)."""
    return flow_acc_cells >= threshold


def strahler_order(streams: np.ndarray, fdir: np.ndarray) -> np.ndarray:
    """
    Strahler stream order per stream cell (1 = first-order headwater reach).

    Cells are resolved from upstream to downstream: a confluence of two
    equal-order reaches produces the next order up.
    """
    h, w = streams.shape
    order = np.zeros((h, w), dtype="uint8")
    pending = np.zeros((h, w), dtype="int32")

    stream_cells = [(int(r), int(c)) for r, c in np.argwhere(streams)]
    for r, c in stream_cells:
        code = int(fdir[r, c])
        if code == 0:                      # outlet / flat cell: nothing downstream
            continue
        dr, dc = _offset_for_code(code)
        nr, nc = r + dr, c + dc
        if 0 <= nr < h and 0 <= nc < w and streams[nr, nc]:
            pending[nr, nc] += 1

    queue = [(r, c) for r, c in stream_cells if pending[r, c] == 0]
    while queue:
        r, c = queue.pop()
        up_orders = []
        for dr, dc, code in D8_OFFSETS:
            ur, uc = r - dr, c - dc          # cells whose D8 target is (r, c)
            if 0 <= ur < h and 0 <= uc < w and streams[ur, uc] and int(fdir[ur, uc]) == code:
                up_orders.append(int(order[ur, uc]))
        up_orders = [o for o in up_orders if o > 0]
        if not up_orders:
            order[r, c] = 1
        else:
            mx = max(up_orders)
            order[r, c] = mx + 1 if up_orders.count(mx) > 1 else mx

        dr, dc = _offset_for_code(int(fdir[r, c]))
        nr, nc = r + dr, c + dc
        if 0 <= nr < h and 0 <= nc < w and streams[nr, nc]:
            pending[nr, nc] -= 1
            if pending[nr, nc] == 0:
                queue.append((nr, nc))
    return order


def stream_geojson(streams: np.ndarray, order: np.ndarray, fdir: np.ndarray,
                   grid: RasterGrid, max_features: int = 500) -> dict:
    """
    Convert the raster stream network into GeoJSON LineStrings by chaining
    stream cells from each headwater down to the outlet / confluence.
    """
    features: List[dict] = []
    visited = np.zeros(streams.shape, dtype=bool)
    h, w = streams.shape

    heads: List[Tuple[int, int]] = []
    for r, c in np.argwhere(streams):
        has_upstream = False
        for dr, dc, code in D8_OFFSETS:
            ur, uc = int(r) - dr, int(c) - dc
            if 0 <= ur < h and 0 <= uc < w and streams[ur, uc] and int(fdir[ur, uc]) == code:
                has_upstream = True
                break
        if not has_upstream:
            heads.append((int(r), int(c)))

    for r0, c0 in heads:
        if visited[r0, c0]:
            continue
        path = [(grid.lon_of(c0), grid.lat_of(r0))]
        r, c = r0, c0
        visited[r, c] = True
        ord_max = int(order[r, c])
        while True:
            dr, dc = _offset_for_code(int(fdir[r, c]))
            nr, nc = r + dr, c + dc
            if not (0 <= nr < h and 0 <= nc < w) or not streams[nr, nc] or visited[nr, nc]:
                break
            visited[nr, nc] = True
            ord_max = max(ord_max, int(order[nr, nc]))
            path.append((grid.lon_of(nc), grid.lat_of(nr)))
            r, c = nr, nc
        if len(path) < 2:
            continue
        features.append({
            "type": "Feature",
            "properties": {"order": ord_max, "length_m": round(_path_length_m(path), 1)},
            "geometry": {"type": "LineString",
                         "coordinates": [[round(x, 6), round(y, 6)] for x, y in path]},
        })
        if len(features) >= max_features:
            break

    return {"type": "FeatureCollection", "features": features}


def _path_length_m(path: Sequence[Tuple[float, float]]) -> float:
    total = 0.0
    for (lon1, lat1), (lon2, lat2) in zip(path[:-1], path[1:]):
        m_per_deg_lng, m_per_deg_lat = metres_per_degree((lat1 + lat2) / 2)
        total += math.hypot((lon2 - lon1) * m_per_deg_lng, (lat2 - lat1) * m_per_deg_lat)
    return total


# --------------------------------------------------------------------------- #
# 4. Catchment delineation from a pour point
# --------------------------------------------------------------------------- #
def delineate_catchment(fdir: np.ndarray, grid: RasterGrid, lat: float, lon: float,
                        snap_radius_cells: int = 12) -> Tuple[np.ndarray, Tuple[int, int]]:
    """
    Mask of every cell that drains into the pour point.

    The pour point is snapped to the largest contributing cell nearby so a
    structure digitised a few pixels off the channel still resolves.
    """
    h, w = fdir.shape
    r = int(np.clip(round(grid.row_of(lat)), 0, h - 1))
    c = int(np.clip(round(grid.col_of(lon)), 0, w - 1))
    donors = _reverse_adjacency(fdir)

    def _walk(start_r: int, start_c: int) -> np.ndarray:
        mask = np.zeros((h, w), dtype=bool)
        stack = [start_r * w + start_c]
        while stack:
            idx = stack.pop()
            if mask.flat[idx]:
                continue
            mask.flat[idx] = True
            for donor in donors.get(idx, ()):
                if not mask.flat[donor]:
                    stack.append(donor)
        return mask

    mask = _walk(r, c)
    best_mask, best_count, best_cell = mask, int(mask.sum()), (r, c)
    if mask.sum() <= snap_radius_cells and snap_radius_cells > 0:
        # Standard practice: snap the pour point to the cell with the highest
        # flow accumulation nearby (i.e. the real channel), then re-delineate.
        for dr in range(-snap_radius_cells, snap_radius_cells + 1):
            for dc in range(-snap_radius_cells, snap_radius_cells + 1):
                rr, cc = r + dr, c + dc
                if 0 <= rr < h and 0 <= cc < w:
                    cand = _walk(rr, cc)
                    if cand.sum() > best_count:
                        best_mask, best_count, best_cell = cand, int(cand.sum()), (rr, cc)
    return best_mask, best_cell


def catchment_polygon_geojson(mask: np.ndarray, grid: RasterGrid,
                              simplify_step: int = 3) -> dict:
    """Outline of a catchment mask (row-wise left/right envelope)."""
    rows_with = np.argwhere(mask.any(axis=1)).ravel()
    if rows_with.size == 0:
        return {"type": "Polygon", "coordinates": [[]]}
    left_edge, right_edge = [], []
    for r in rows_with:
        cols = np.argwhere(mask[r]).ravel()
        left_edge.append([grid.lon_of(cols.min()), grid.lat_of(r)])
        right_edge.append([grid.lon_of(cols.max()), grid.lat_of(r)])
    ring = left_edge[::max(simplify_step, 1)] + right_edge[::-max(simplify_step, 1)]
    if ring and ring[0] != ring[-1]:
        ring.append(ring[0])
    return {"type": "Polygon", "coordinates": [[[round(x, 6), round(y, 6)] for x, y in ring]]}


# --------------------------------------------------------------------------- #
# 5. Slope / aspect / TWI
# --------------------------------------------------------------------------- #
def slope_aspect(dem: np.ndarray, grid: RasterGrid) -> Tuple[np.ndarray, np.ndarray]:
    """Slope (%) and aspect (degrees clockwise from north) from the DEM."""
    cell_x, cell_y = _cell_sizes(grid)
    dzdy, dzdx = np.gradient(dem.astype("float64"), cell_y, cell_x)
    slope_rad = np.arctan(np.hypot(dzdx, dzdy))
    slope_pct = np.tan(slope_rad) * 100.0
    aspect = (270.0 - np.degrees(np.arctan2(dzdy, -dzdx))) % 360.0
    return slope_pct.astype("float32"), aspect.astype("float32")


def topographic_wetness_index(flow_acc_area_m2: np.ndarray, slope_pct: np.ndarray,
                              grid: RasterGrid) -> np.ndarray:
    """TWI = ln(a / tan(beta)) - a saturation / recharge proxy for site selection."""
    cell_x, _cell_y = _cell_sizes(grid)
    specific_area = np.maximum(flow_acc_area_m2, 1e-6) / max(cell_x, 1e-6)
    tan_slope = np.maximum(slope_pct / 100.0, 1e-3)
    return np.log(specific_area / tan_slope).astype("float32")


# --------------------------------------------------------------------------- #
# 6. Pipeline orchestration
# --------------------------------------------------------------------------- #
def build_terrain_model(watershed_id: str = "watershed_001", data_dir: str = DATA_DIR,
                        stream_threshold: int = DEFAULT_STREAM_THRESHOLD) -> TerrainModel:
    """Run the complete terrain pipeline and cache every derived product."""
    dem, grid = load_dem(watershed_id, data_dir)
    filled = fill_sinks(dem)
    fdir = flow_direction_d8(filled, grid)

    pixel_area_m2 = np.broadcast_to(grid.pixel_area_m2(), dem.shape)
    acc_cells = flow_accumulation(fdir)
    acc_area = flow_accumulation(fdir, weights=pixel_area_m2)

    streams = extract_streams(acc_cells, stream_threshold)
    order = strahler_order(streams, fdir)
    slope_pct, aspect = slope_aspect(filled, grid)
    twi = topographic_wetness_index(acc_area, slope_pct, grid)

    # ---- morphometry ----------------------------------------------------- #
    cell_area_ha = grid.pixel_area_m2() / 10_000.0
    cell_x, cell_y = _cell_sizes(grid)
    total_len_m = 0.0
    h, w = streams.shape
    for r, c in np.argwhere(streams):
        dr, dc = _offset_for_code(int(fdir[r, c]))
        dist = math.hypot(dc * cell_x, dr * cell_y)
        total_len_m += dist if dist > 0 else min(cell_x, cell_y)

    channels = stream_geojson(streams, order, fdir, grid)
    channel_lengths = [f["properties"]["length_m"] for f in channels["features"]] or [0.0]
    main_channel_m = float(max(channel_lengths))
    n_channels = len([ln for ln in channel_lengths if ln > 2.0 * min(cell_x, cell_y)])

    basin_area_ha = float(dem.size * float(cell_area_ha.mean()))
    basin_area_km2 = basin_area_ha / 100.0
    lat_mid = (grid.min_lat + grid.max_lat) / 2.0
    m_per_deg_lng, m_per_deg_lat = metres_per_degree(lat_mid)
    width_m = (grid.max_lon - grid.min_lon) * m_per_deg_lng
    height_m = (grid.max_lat - grid.min_lat) * m_per_deg_lat
    perimeter_m = 2 * (width_m + height_m)
    max_len_m = max(main_channel_m, basin_length_guess := max(
        math.hypot(width_m, height_m) * 0.9, 1e-6))
    max_len_m = max(max_len_m, 1e-6)

    stats = {
        "dem_min_m": round(float(dem.min()), 2),
        "dem_max_m": round(float(dem.max()), 2),
        "dem_mean_m": round(float(dem.mean()), 2),
        "total_relief_m": round(float(filled.max() - filled.min()), 2),
        "mean_slope_pct": round(float(slope_pct.mean()), 2),
        "max_slope_pct": round(float(slope_pct.max()), 2),
        "mean_twi": round(float(twi.mean()), 2),
        "stream_cells": int(streams.sum()),
        "stream_length_m": round(total_len_m, 1),
        "stream_length_km": round(total_len_m / 1000.0, 3),
        "drainage_density_km_per_km2": round(safe_div(total_len_m / 1000.0, basin_area_km2), 3),
        "stream_frequency_per_km2": round(safe_div(n_channels, basin_area_km2), 2),
        "basin_area_ha": round(basin_area_ha, 2),
        "basin_area_km2": round(basin_area_km2, 4),
        "basin_perimeter_m": round(perimeter_m, 1),
        "basin_length_m": round(max_len_m, 1),
        "main_channel_length_m": round(main_channel_m, 1),
        "n_channels": n_channels,
        "form_factor": round(safe_div(basin_area_km2 * 1e6, max_len_m ** 2), 4),
        "elongation_ratio": round(safe_div(2 * math.sqrt(basin_area_km2 / math.pi) * 1000, max_len_m), 3),
        "relief_ratio": round(safe_div(float(filled.max() - filled.min()), max_len_m), 5),
        "max_strahler_order": int(order.max()) if order.size else 0,
        "stream_threshold_cells": int(stream_threshold),
    }
    for o in range(1, (int(order.max()) if order.size else 0) + 1):
        stats[f"stream_order_{o}_cells"] = int((order == o).sum())
        stats[f"stream_order_{o}_length_m"] = round(
            float((order == o).sum()) * min(cell_x, cell_y), 1)

    model = TerrainModel(dem=dem, filled=filled, grid=grid, flow_dir=fdir,
                         flow_acc_cells=acc_cells, flow_acc_area_m2=acc_area,
                         slope_pct=slope_pct, aspect=aspect, twi=twi,
                         streams=streams, order=order, stats=stats)
    model._cell_x, model._cell_y = cell_x, cell_y
    return model
