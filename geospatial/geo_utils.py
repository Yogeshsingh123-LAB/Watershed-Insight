"""
geo_utils.py
============
Lightweight, dependency-free geospatial helpers used across the Watershed Insight engine.

Everything here works on plain NumPy / Python so the analytical engine can run
without GDAL, rasterio or geopandas installed (important for low-cost, easily
replicable SIH deployments).  All coordinates are assumed to be geographic
longitude / latitude in decimal degrees (EPSG:4326).
"""

from __future__ import annotations

import math
from typing import Iterable, List, Sequence, Tuple

import numpy as np

# Mean radius of the earth (m) - used for the spherical (haversine) formulas.
EARTH_RADIUS_M = 6_371_008.8

# Length of one degree of latitude / longitude at the equator (m).
METRES_PER_DEG_LAT = 111_320.0
METRES_PER_DEG_LNG_EQ = 111_320.0


# --------------------------------------------------------------------------- #
# Distance / geometry
# --------------------------------------------------------------------------- #
def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two WGS84 points, in metres."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = phi2 - phi1
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2.0) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def metres_per_degree(lat: float) -> Tuple[float, float]:
    """Return (metres per degree longitude, metres per degree latitude) at ``lat``."""
    return METRES_PER_DEG_LNG_EQ * math.cos(math.radians(lat)), METRES_PER_DEG_LAT


def destination_point(lat: float, lon: float, bearing_deg: float, distance_m: float) -> Tuple[float, float]:
    """Point at ``distance_m`` from (lat, lon) along a compass bearing (deg from north)."""
    brng = math.radians(bearing_deg)
    d_r = distance_m / EARTH_RADIUS_M
    phi1, lam1 = math.radians(lat), math.radians(lon)
    phi2 = math.asin(math.sin(phi1) * math.cos(d_r) + math.cos(phi1) * math.sin(d_r) * math.cos(brng))
    lam2 = lam1 + math.atan2(
        math.sin(brng) * math.sin(d_r) * math.cos(phi1),
        math.cos(d_r) - math.sin(phi1) * math.sin(phi2),
    )
    return math.degrees(phi2), math.degrees(lam2)


def buffer_polygon_geojson(lat: float, lon: float, radius_m: float, steps: int = 64) -> dict:
    """GeoJSON Polygon geometry approximating a circular buffer of ``radius_m``."""
    ring = [[lon, lat]]  # not used - kept for clarity
    ring = []
    for i in range(steps):
        bearing = (360.0 / steps) * i
        p_lat, p_lon = destination_point(lat, lon, bearing, radius_m)
        ring.append([round(p_lon, 7), round(p_lat, 7)])
    ring.append(ring[0])  # close the ring (GeoJSON requirement)
    return {"type": "Polygon", "coordinates": [ring]}


# --------------------------------------------------------------------------- #
# Raster <-> world coordinates
# --------------------------------------------------------------------------- #
class RasterGrid:
    """
    Affine (north-up) mapping between a raster array and geographic coordinates.

    ``bounds`` is ``[min_lon, min_lat, max_lon, max_lat]``.
    """

    def __init__(self, bounds: Sequence[float], height: int, width: int):
        self.bounds = [float(b) for b in bounds]
        self.height = int(height)
        self.width = int(width)
        self.min_lon, self.min_lat, self.max_lon, self.max_lat = self.bounds
        self.dx = (self.max_lon - self.min_lon) / self.width      # deg / pixel (x)
        self.dy = (self.max_lat - self.min_lat) / self.height     # deg / pixel (y)

    # -- conversions ------------------------------------------------------- #
    def col_of(self, lon: float) -> float:
        """
        Fractional *pixel-centre* column index for a longitude, so that
        ``col_of(lon_of(c)) == c`` exactly (round it to get the nearest cell).
        """
        return (lon - self.min_lon) / self.dx - 0.5

    def row_of(self, lat: float) -> float:
        """Fractional pixel-centre row index - see :meth:`col_of`."""
        return (self.max_lat - lat) / self.dy - 0.5

    def lon_of(self, col: float) -> float:
        return self.min_lon + (col + 0.5) * self.dx

    def lat_of(self, row: float) -> float:
        return self.max_lat - (row + 0.5) * self.dy

    def row_centre_lats(self) -> np.ndarray:
        """Latitude of the centre of every raster row (shape: ``(height,)``)."""
        rows = np.arange(self.height) + 0.5
        return self.max_lat - rows * self.dy

    def pixel_area_m2(self) -> np.ndarray:
        """Ground area (m²) of every pixel, broadcastable as ``(height, 1)``."""
        lats = self.row_centre_lats()
        m_per_deg_lng = METRES_PER_DEG_LNG_EQ * np.cos(np.radians(lats))
        cell_x = m_per_deg_lng * self.dx
        cell_y = METRES_PER_DEG_LAT * self.dy
        return (cell_x * cell_y).reshape(-1, 1)

    def pixel_area_ha(self) -> np.ndarray:
        return self.pixel_area_m2() / 10_000.0

    def area_map_m2(self) -> np.ndarray:
        """Full (height, width) ground-area map in m² (per-pixel area)."""
        return np.broadcast_to(self.pixel_area_m2(), (self.height, self.width))

    def area_map_ha(self) -> np.ndarray:
        """Full (height, width) ground-area map in hectares."""
        return self.area_map_m2() / 10_000.0

    def extent(self) -> Tuple[float, float, float, float]:
        """matplotlib ``extent`` = (left, right, bottom, top)."""
        return self.min_lon, self.max_lon, self.min_lat, self.max_lat

    def leaflet_bounds(self) -> List[List[float]]:
        """Leaflet ``ImageOverlay`` bounds: ``[[south, west], [north, east]]``."""
        return [[self.min_lat, self.min_lon], [self.max_lat, self.max_lon]]

    def shape(self) -> Tuple[int, int]:
        return self.height, self.width


def circular_mask(grid: RasterGrid, lat: float, lon: float, radius_m: float) -> np.ndarray:
    """
    Boolean mask of the pixels whose centre falls inside ``radius_m`` of a point.

    The buffer is evaluated in *ground* metres (not degrees), so it stays a true
    circle on the ground regardless of latitude.
    """
    col = grid.col_of(lon)
    row = grid.row_of(lat)

    m_per_deg_lng, m_per_deg_lat = metres_per_degree(lat)
    radius_cols = radius_m / (m_per_deg_lng * grid.dx)
    radius_rows = radius_m / (m_per_deg_lat * grid.dy)
    radius_rows = max(radius_rows, 0.75)  # keep at least the centre pixel
    radius_cols = max(radius_cols, 0.75)

    rows, cols = np.ogrid[: grid.height, : grid.width]
    return ((rows - row) / radius_rows) ** 2 + ((cols - col) / radius_cols) ** 2 <= 1.0


# --------------------------------------------------------------------------- #
# Vector helpers (GeoJSON)
# --------------------------------------------------------------------------- #
def polygon_area_m2(ring: Iterable[Sequence[float]]) -> float:
    """
    Planimetric area (m²) of a GeoJSON ring ``[[lon, lat], ...]`` using the
    spherical excess (shoelace on an equal-area projection) approximation.
    """
    pts = [(float(lon), float(lat)) for lon, lat in ring]
    if len(pts) < 4:
        return 0.0
    if pts[0] != pts[-1]:
        pts.append(pts[0])
    # Project the ring to a local metric frame at its mean latitude, then apply
    # the shoelace formula.  Accurate enough well beyond a micro-watershed.
    lat_ref = sum(p[1] for p in pts) / len(pts)
    kx = METRES_PER_DEG_LNG_EQ * math.cos(math.radians(lat_ref))
    ky = METRES_PER_DEG_LAT
    area = sum(
        (x1 * kx) * (y2 * ky) - (x2 * kx) * (y1 * ky)
        for (x1, y1), (x2, y2) in zip(pts[:-1], pts[1:])
    )
    return abs(area) / 2.0


def geojson_polygon_area_ha(geometry: dict) -> float:
    """Area (hectares) of a Polygon / MultiPolygon GeoJSON geometry."""
    gtype = geometry.get("type")
    coords = geometry.get("coordinates", [])
    total = 0.0
    if gtype == "Polygon":
        rings = coords
    elif gtype == "MultiPolygon":
        rings = [ring for poly in coords for ring in poly]
    else:
        return 0.0
    for idx, ring in enumerate(rings):
        a = polygon_area_m2(ring)
        total += -a if idx > 0 else a   # subtract holes
    return max(total, 0.0) / 10_000.0


def bbox_of_geojson(geometry: dict) -> List[float]:
    """``[min_lon, min_lat, max_lon, max_lat]`` of any GeoJSON geometry."""
    def walk(node, acc):
        if isinstance(node, (int, float)):
            return acc
        if isinstance(node[0], (int, float)):
            lon, lat = node[0], node[1]
            return [
                min(acc[0], lon), min(acc[1], lat), max(acc[2], lon), max(acc[3], lat)
            ]
        for child in node:
            acc = walk(child, acc)
        return acc

    acc = walk(geometry.get("coordinates", []), [180.0, 90.0, -180.0, -90.0])
    return [float(v) for v in acc]


def centroid_of_geojson(geometry: dict) -> Tuple[float, float]:
    bbox = bbox_of_geojson(geometry)
    return (bbox[1] + bbox[3]) / 2.0, (bbox[0] + bbox[2]) / 2.0


# --------------------------------------------------------------------------- #
# Statistics helpers
# --------------------------------------------------------------------------- #
def safe_div(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Division that never explodes on a zero denominator."""
    if denominator in (0, 0.0) or denominator is None:
        return default
    return numerator / denominator


def pct_change(before: float, after: float):
    """
    Percentage change with a guard for near-zero baselines.

    Returns ``None`` when the baseline is zero but the new value is not - the
    honest answer is "new / undefined", not "+100 %".
    """
    if abs(before) < 1e-6:
        return 0.0 if abs(after) < 1e-6 else None
    return round(((after - before) / abs(before)) * 100.0, 1)


def describe(values: np.ndarray, decimals: int = 3) -> dict:
    """Compact statistical summary of a numeric array."""
    values = np.asarray(values, dtype="float64").ravel()
    if values.size == 0:
        return {"count": 0, "mean": 0.0, "std": 0.0, "min": 0.0, "max": 0.0,
                "p25": 0.0, "median": 0.0, "p75": 0.0}
    return {
        "count": int(values.size),
        "mean": round(float(np.nanmean(values)), decimals),
        "std": round(float(np.nanstd(values)), decimals),
        "min": round(float(np.nanmin(values)), decimals),
        "max": round(float(np.nanmax(values)), decimals),
        "p25": round(float(np.nanpercentile(values, 25)), decimals),
        "median": round(float(np.nanpercentile(values, 50)), decimals),
        "p75": round(float(np.nanpercentile(values, 75)), decimals),
    }


def normalise(array: np.ndarray, low: float, high: float) -> np.ndarray:
    """Clip + scale an array into ``0..1`` between ``low`` and ``high``."""
    array = np.asarray(array, dtype="float64")
    if high - low == 0:
        return np.clip(array, 0, 1)
    return np.clip((array - low) / (high - low), 0.0, 1.0)
