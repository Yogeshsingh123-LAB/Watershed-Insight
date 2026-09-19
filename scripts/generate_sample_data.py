"""
generate_sample_data.py
=======================
Builds the synthetic-but-realistic demo dataset that ships with the repository.

Why synthetic?
--------------
The SRISHTI / DRISHTI production stacks require authenticated access.  To keep
the platform reproducible offline (and to let SIH evaluators run it in 60
seconds) this script synthesises a physically consistent micro-watershed:

* a fractal **DEM** with a carved drainage channel,
* **six** multi-temporal Sentinel-like band stacks (red, green, NIR, SWIR)
  spanning 2024-2026, with seasonal monsoon cycles *and* a spatially decaying
  intervention effect around each structure,
* **IWMP interventions** (check dams, farm ponds, plantations, contour bunds,
  percolation tanks, gully plugs) with sanctioned cost and capacity,
* **geo-coded field photographs** rendered as photo-realistic scenes and
  stamped with real EXIF GPS + timestamps (including deliberately imperfect
  ones: missing GPS, blurred, pre-installation, duplicate and out-of-buffer).

Run:  python scripts/generate_sample_data.py
"""

from __future__ import annotations

import csv
import datetime as dt
import json
import math
import os
import random
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from geospatial.geo_utils import RasterGrid, metres_per_degree  # noqa: E402
from geospatial.lulc import classify  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data", "sample")

SEED = 26015
RNG = np.random.default_rng(SEED)
random.seed(SEED)

GRID = 250                     # raster size (250 x 250 cells)
CELL_M = 12.0                  # nominal ground cell size (m) -> ~3.0 x 3.0 km

# --------------------------------------------------------------------------- #
# Watershed definitions
# --------------------------------------------------------------------------- #
WATERSHEDS = [
    {
        "id": "watershed_001",
        "code": "MWS-MH-2025-014",
        "name": "Aurangabad North Micro-Watershed",
        "state": "Maharashtra",
        "state_code": "MH",
        "district": "Chhatrapati Sambhajinagar",
        "district_code": "MH-CSN",
        "block": "Paithan",
        "block_code": "MH-CSN-PAI",
        "project": "IWMP Batch-XII / PMKSY-WDC 2.0",
        "village": "Nidhona Bk.",
        "centre": [19.8445, 75.3430],
        "span_deg": [0.030, 0.020],
        "rainfall_mm": 712,
        "soil": "Medium black (Vertic Inceptisol)",
        "aquifer": "Deccan basalt - weathered / fractured",
        "population": 4180,
        "households": 806,
    },
    {
        "id": "watershed_002",
        "code": "MWS-MH-2025-027",
        "name": "Paithan South Micro-Watershed",
        "state": "Maharashtra",
        "state_code": "MH",
        "district": "Chhatrapati Sambhajinagar",
        "district_code": "MH-CSN",
        "block": "Paithan",
        "block_code": "MH-CSN-PAI",
        "project": "IWMP Batch-XII / PMKSY-WDC 2.0",
        "village": "Pachod",
        "centre": [19.7920, 75.3720],
        "span_deg": [0.026, 0.018],
        "rainfall_mm": 668,
        "soil": "Shallow murrum (Entisol)",
        "aquifer": "Deccan basalt - vesicular",
        "population": 2960,
        "households": 571,
    },
]

# Six acquisition dates spanning 2024-2026.  T0 and T1 are BOTH pre-monsoon
# acquisitions so the headline comparison is season-neutral.
EPOCHS = [
    {"key": "before",       "date": "2024-05-28", "label": "Pre-monsoon 2024 (baseline)",
     "role": "T0", "season": "pre_monsoon", "cloud": 3.1},
    {"key": "2024-11-05",   "date": "2024-11-05", "label": "Post-monsoon 2024",
     "role": "intermediate", "season": "post_monsoon", "cloud": 8.4},
    {"key": "2025-05-22",   "date": "2025-05-22", "label": "Pre-monsoon 2025",
     "role": "intermediate", "season": "pre_monsoon", "cloud": 1.7},
    {"key": "2025-10-18",   "date": "2025-10-18", "label": "Post-monsoon 2025",
     "role": "intermediate", "season": "post_monsoon", "cloud": 12.6},
    {"key": "after",        "date": "2026-05-26", "label": "Pre-monsoon 2026 (latest)",
     "role": "T1", "season": "pre_monsoon", "cloud": 2.2},
    {"key": "2026-09-02",   "date": "2026-09-02", "label": "Monsoon 2026 (current)",
     "role": "intermediate", "season": "monsoon", "cloud": 24.5},
]

INTERVENTION_TEMPLATES = {
    "check_dam": {"label": "Masonry Check Dam", "cost": (285000, 640000),
                  "capacity": (2.4, 9.8), "code": "CD",
                  "water_gain": 0.62, "veg_gain": 0.26, "radius_m": 300},
    "farm_pond": {"label": "Farm Pond (lined)", "cost": (145000, 320000),
                  "capacity": (0.8, 3.2), "code": "FP",
                  "water_gain": 0.55, "veg_gain": 0.17, "radius_m": 210},
    "percolation_tank": {"label": "Percolation Tank", "cost": (520000, 980000),
                         "capacity": (8.5, 22.0), "code": "PT",
                         "water_gain": 0.70, "veg_gain": 0.21, "radius_m": 340},
    "plantation": {"label": "Horti-Afforestation", "cost": (120000, 260000),
                   "capacity": (0.0, 0.0), "code": "PL",
                   "water_gain": 0.02, "veg_gain": 0.40, "radius_m": 310},
    "contour_bund": {"label": "Continuous Contour Bund", "cost": (90000, 210000),
                     "capacity": (0.0, 0.0), "code": "CB",
                     "water_gain": 0.10, "veg_gain": 0.26, "radius_m": 260},
    "gully_plug": {"label": "Gully Plug / Nala Bund", "cost": (45000, 120000),
                   "capacity": (0.2, 1.1), "code": "GP",
                   "water_gain": 0.30, "veg_gain": 0.20, "radius_m": 190},
}

STATUS_POOL = ["Completed", "Completed", "Completed", "Ongoing", "Completed"]


# --------------------------------------------------------------------------- #
# Terrain helpers
# --------------------------------------------------------------------------- #
def smooth_noise(shape, scale=12.0, rng=RNG):
    """Fractal-ish smooth noise: random field -> Gaussian blur -> 0..1."""
    base = rng.random(shape).astype("float32")
    img = Image.fromarray((base * 255).astype("uint8"))
    img = img.filter(ImageFilter.GaussianBlur(radius=scale))
    arr = np.asarray(img, dtype="float32") / 255.0
    arr = (arr - arr.min()) / max(arr.max() - arr.min(), 1e-6)
    return arr


def fractal_field(shape, octaves=4, scale=18.0, rng=RNG):
    out = np.zeros(shape, dtype="float32")
    amp, total = 1.0, 0.0
    for o in range(octaves):
        out += smooth_noise(shape, scale=max(scale / (2 ** o), 1.0), rng=rng) * amp
        total += amp
        amp *= 0.55
    return out / total


def build_dem(shape, grid, channel_lon, channel_lat, rng=RNG):
    """
    Fractal terrain with a sinuous valley carved along a channel, so the
    hydrology module recovers a realistic, connected drainage network.
    """
    h, w = shape
    lons = np.linspace(grid.min_lon, grid.max_lon, w)
    lats = np.linspace(grid.max_lat, grid.min_lat, h)
    xx, yy = np.meshgrid(lons, lats)

    base = fractal_field(shape, octaves=5, scale=26.0, rng=rng)
    ridge = fractal_field(shape, octaves=3, scale=60.0, rng=rng)

    # Elevation 480 -> 560 m with a broad north-west to south-east gradient.
    dem = 470.0 + 95.0 * ridge + 14.0 * base
    dem += 26.0 * np.linspace(1, 0, h)[:, None]        # high ground in the north

    # Carve a sinuous channel: distance to a meandering centreline.
    t = np.linspace(0, 1, 900)
    centre_lon = channel_lon + 0.0065 * np.sin(2.6 * math.pi * t)
    centre_lat = np.linspace(grid.max_lat - 0.001, grid.min_lat + 0.001, 900)
    dist = np.full(shape, 1e9, dtype="float32")
    for cx, cy in zip(centre_lon[::12], centre_lat[::12]):
        dist = np.minimum(dist, np.sqrt(((xx - cx) * 111320 * math.cos(math.radians(19.84))) ** 2 +
                                        ((yy - cy) * 111320) ** 2))
    # V-shaped valley, ~55 m deep, ~180 m half-width.
    carve = 58.0 * np.exp(-(dist / 190.0) ** 2) + 22.0 * np.exp(-(dist / 420.0) ** 2)
    dem = dem - carve

    # Tributary gullies feeding the main channel.
    for _ in range(6):
        glon = channel_lon + rng.uniform(-0.014, 0.014)
        glat = rng.uniform(grid.min_lat + 0.002, grid.max_lat - 0.002)
        angle = rng.uniform(0, math.pi)
        gx = (xx - glon) * 111320 * math.cos(math.radians(19.84))
        gy = (yy - glat) * 111320
        along = gx * math.cos(angle) + gy * math.sin(angle)
        across = -gx * math.sin(angle) + gy * math.cos(angle)
        gully = np.where(along > 0, 16.0 * np.exp(-(across / 55.0) ** 2) *
                         np.exp(-np.maximum(along - 700, 0) / 900.0), 0.0)
        dem = dem - gully

    dem = dem + rng.normal(0, 0.35, shape).astype("float32")   # micro-relief
    return dem.astype("float32")


# --------------------------------------------------------------------------- #
# Landscape (spectral) synthesis
# --------------------------------------------------------------------------- #
def build_landscape(shape, dem, grid, rng=RNG):
    """Static land-surface fields: moisture, fertility, tree cover, settlement."""
    h, w = shape
    dem_n = (dem - dem.min()) / max(dem.max() - dem.min(), 1e-6)

    moisture = np.clip(fractal_field(shape, 3, 30.0, rng) * 0.7 + (1 - dem_n) * 0.5, 0, 1)
    fertility = np.clip(fractal_field(shape, 3, 22.0, rng), 0, 1)
    tree_cover = np.clip(fractal_field(shape, 3, 14.0, rng) ** 1.6, 0, 1)
    settlement = np.clip((fractal_field(shape, 2, 9.0, rng) - 0.62) * 3.0, 0, 1)

    # A couple of village clusters (built-up cores).
    for _ in range(3):
        r = int(rng.integers(0.15 * h, 0.85 * h))
        c = int(rng.integers(0.15 * w, 0.85 * w))
        rr, cc = np.ogrid[:h, :w]
        settlement = np.maximum(settlement, np.exp(-(((rr - r) ** 2 + (cc - c) ** 2) / (2 * 11.0 ** 2))))
    return {"moisture": moisture, "fertility": fertility,
            "tree_cover": tree_cover, "settlement": settlement}


def epoch_bands(shape, grid, landscape, interventions, epoch, dem, rng=RNG):
    """
    Sentinel-like surface-reflectance bands for one acquisition date.

    Reflectance = static landscape component
                + seasonal (monsoon) component
                + maturity-weighted intervention influence (Gaussian decay)
                + sensor noise.
    """
    h, w = shape
    lons = np.linspace(grid.min_lon, grid.max_lon, w)
    lats = np.linspace(grid.max_lat, grid.min_lat, h)
    xx, yy = np.meshgrid(lons, lats)

    season = epoch["season"]
    # Seasonal drivers calibrated for a semi-arid Deccan basalt watershed.
    seasonal_green = {"pre_monsoon": 0.35, "monsoon": 1.00, "post_monsoon": 0.70}[season]
    channel_wetness = {"pre_monsoon": 0.03, "monsoon": 0.60, "post_monsoon": 0.20}[season]

    moisture, fertility = landscape["moisture"], landscape["fertility"]
    tree_cover, settlement = landscape["tree_cover"], landscape["settlement"]

    # Vegetation fraction field V (0 = fallow/bare, 1 = full canopy).
    veg = (0.30 * tree_cover
           + 0.55 * fertility * seasonal_green
           + 0.35 * moisture * seasonal_green)

    # Natural channel wetness W (0 = dry, 1 = full).
    dem_n = (dem - dem.min()) / max(dem.max() - dem.min(), 1e-6)
    channel = np.clip((0.20 - dem_n) * 5.5, 0, 1)
    wetness = channel * channel_wetness

    # ---- intervention influence ------------------------------------------ #
    # Water harvesting structures keep moisture in the landscape *after* the
    # monsoon, so their dry-season (pre-monsoon) signature is the strongest -
    # this is precisely the impact signal the platform is built to detect.
    veg_season_factor = {"pre_monsoon": 0.90, "monsoon": 0.55, "post_monsoon": 0.80}[season]
    water_season_factor = {"pre_monsoon": 0.85, "monsoon": 1.00, "post_monsoon": 0.90}[season]

    epoch_date = dt.date.fromisoformat(epoch["date"])
    for item in interventions:
        install = dt.date.fromisoformat(item["installation_date"])
        if epoch_date < install:
            continue
        # Maturity: impact ramps up over ~14 months after construction.
        months = max((epoch_date - install).days / 30.44, 0.0)
        maturity = float(np.clip(months / 14.0, 0.0, 1.0))
        tmpl = INTERVENTION_TEMPLATES[item["type"]]
        # The impoundment itself is compact; the recharge / moisture halo that
        # drives the vegetation response is much broader.
        r_veg_deg = (tmpl["radius_m"] / 1000.0) / 111.0
        r_wat_deg = r_veg_deg * 0.72
        d = np.sqrt((xx - item["longitude"]) ** 2 + (yy - item["latitude"]) ** 2)
        veg += tmpl["veg_gain"] * np.exp(-(d / r_veg_deg) ** 2) * maturity * veg_season_factor
        wetness += tmpl["water_gain"] * np.exp(-(d / r_wat_deg) ** 2) * maturity * water_season_factor

    veg = np.clip(veg, 0.0, 1.0)
    wetness = np.clip(wetness, 0.0, 1.0)

    # ---- reflectance mixing model ---------------------------------------- #
    # Bare soil end-member -> full canopy / open water end-member.
    red = 0.26 - 0.20 * veg - 0.14 * wetness + 0.10 * settlement
    green = 0.19 + 0.02 * veg + 0.03 * wetness
    nir = 0.28 + 0.20 * veg - 0.44 * wetness - 0.05 * settlement
    swir = 0.34 - 0.12 * veg - 0.40 * wetness + 0.08 * settlement

    noise = lambda: rng.normal(0, 0.010, shape).astype("float32")
    bands = {
        "red": np.clip(red + noise(), 0.01, 0.75).astype("float32"),
        "green": np.clip(green + noise(), 0.01, 0.75).astype("float32"),
        "nir": np.clip(nir + noise(), 0.01, 0.85).astype("float32"),
        "swir": np.clip(swir + noise(), 0.01, 0.85).astype("float32"),
    }
    return bands


# --------------------------------------------------------------------------- #
# Field photo synthesis
# --------------------------------------------------------------------------- #
def _gradient_sky(h, w, top=(120, 168, 214), bottom=(206, 226, 240)):
    sky = np.zeros((h, w, 3), dtype="float32")
    for i, (c1, c2) in enumerate(zip(top, bottom)):
        sky[:, :, i] = np.linspace(c1, c2, h)[:, None]
    return sky


def _soil_canvas(h, w, rng, base=(150, 118, 84)):
    noise = fractal_field((h, w), 4, 16.0, rng)
    arr = np.zeros((h, w, 3), dtype="float32")
    for i, c in enumerate(base):
        arr[:, :, i] = c * (0.72 + 0.55 * noise)
    return arr


def render_field_photo(kind: str, green_frac: float, water_frac: float,
                       quality: str, rng) -> Image.Image:
    """Compose a plausible geo-tagged field photograph (numpy + PIL)."""
    w, h = 1024, 768
    horizon = int(h * 0.34)

    canvas = np.zeros((h, w, 3), dtype="float32")
    canvas[:horizon] = _gradient_sky(horizon, w)
    canvas[horizon:] = _soil_canvas(h - horizon, w, rng)

    # --- vegetation patches ------------------------------------------------ #
    veg_field = fractal_field((h - horizon, w), 3, 11.0, rng)
    veg_mask = veg_field > np.quantile(veg_field, 1.0 - green_frac)
    veg_color = np.array([54, 104, 44], dtype="float32")
    veg_shade = (0.65 + 0.7 * rng.random((h - horizon, w, 1))).astype("float32")
    ground = canvas[horizon:]
    ground[veg_mask] = np.clip(veg_color * veg_shade[veg_mask], 0, 255)

    # Tree / shrub crowns for plantations.
    if kind in ("plantation", "contour_bund") and green_frac > 0.25:
        for _ in range(int(70 * green_frac)):
            x = int(rng.integers(20, w - 20))
            y = int(rng.integers(int((h - horizon) * 0.25), h - horizon - 20))
            r = int(rng.integers(16, 42))
            shade = int(rng.integers(45, 100))
            yy0, yy1 = max(y - r, 0), min(y + r, h - horizon)
            xx0, xx1 = max(x - r, 0), min(x + r, w)
            sel = ((np.arange(yy0, yy1)[:, None] - y) ** 2 +
                   (np.arange(xx0, xx1)[None, :] - x) ** 2) < r ** 2
            ground[yy0:yy1, xx0:xx1][sel] = np.array([38, shade, 42], dtype="float32")

    # --- water body -------------------------------------------------------- #
    if water_frac > 0.02:
        # Impounded water sits *upstream* of the structure, i.e. higher up the
        # frame than the masonry wall which is drawn afterwards.
        cy = horizon + int((h - horizon) * 0.20)
        cx = int(w * 0.5)
        rx = int(w * 0.34 * (0.7 + water_frac))
        ry = int((h - horizon) * 0.22 * (0.7 + water_frac))
        yy, xx = np.ogrid[:h, :w]
        water_mask = (((yy - cy) / ry) ** 2 + ((xx - cx) / rx) ** 2) <= 1.0
        water_mask[:horizon] = False
        ripple = 0.82 + 0.30 * np.sin(xx * 0.09 + yy * 0.22) * np.cos(yy * 0.16)
        canvas[water_mask] = np.clip(
            np.stack([38 * ripple[water_mask], 96 * ripple[water_mask], 148 * ripple[water_mask]], axis=1),
            0, 255)

    # --- engineered structure ---------------------------------------------- #
    img = Image.fromarray(np.clip(canvas, 0, 255).astype("uint8"))
    d = ImageDraw.Draw(img)
    if kind in ("check_dam", "gully_plug", "percolation_tank"):
        wall_top = horizon + int((h - horizon) * 0.40)
        wall_bot = horizon + int((h - horizon) * 0.68)
        d.polygon([(int(w * 0.16), wall_bot), (int(w * 0.30), wall_top),
                   (int(w * 0.70), wall_top), (int(w * 0.84), wall_bot)],
                  fill=(146, 142, 136), outline=(96, 92, 88))
        for i in range(1, 7):                      # masonry courses
            y = wall_top + int((wall_bot - wall_top) * i / 7)
            d.line([(int(w * 0.17), y), (int(w * 0.83), y)], fill=(112, 108, 103), width=2)
        if kind == "check_dam":
            d.rectangle([int(w * 0.44), wall_top - 6, int(w * 0.56), wall_bot], fill=(120, 116, 112))
    elif kind == "contour_bund":
        d.line([(0, horizon + int((h - horizon) * 0.48)), (w, horizon + int((h - horizon) * 0.30))],
               fill=(128, 96, 62), width=int(h * 0.055))
        d.line([(0, horizon + int((h - horizon) * 0.46)), (w, horizon + int((h - horizon) * 0.28))],
               fill=(150, 120, 80), width=6)
    elif kind == "farm_pond":
        d.ellipse([int(w * 0.18), horizon + int((h - horizon) * 0.28),
                   int(w * 0.82), horizon + int((h - horizon) * 0.82)],
                  outline=(120, 92, 60), width=int(h * 0.03))

    # --- sun / haze & vignette --------------------------------------------- #
    arr = np.asarray(img, dtype="float32")
    yy, xx = np.mgrid[0:h, 0:w]
    vign = 1.0 - 0.28 * (((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    arr = np.clip(arr * vign[..., None], 0, 255)

    img = Image.fromarray(arr.astype("uint8"))
    if quality == "blurred":
        img = img.filter(ImageFilter.GaussianBlur(radius=4.5))
    elif quality == "dark":
        img = Image.fromarray(np.clip(arr * 0.42, 0, 255).astype("uint8"))
    img = img.filter(ImageFilter.SMOOTH)
    return img


def make_exif_bytes(lat, lon, when: dt.datetime, device="DRISHTI Mobile App v4.1",
                    include_gps=True):
    try:
        import piexif
    except ImportError:  # pragma: no cover
        return None

    def to_dms(value):
        deg = int(abs(value))
        minute_float = (abs(value) - deg) * 60
        minute = int(minute_float)
        sec = int(round((minute_float - minute) * 60 * 100))   # seconds * 100
        return [(deg, 1), (minute, 1), (sec, 100)]

    gps = {}
    if include_gps:
        gps = {
            piexif.GPSIFD.GPSLatitudeRef: "N" if lat >= 0 else "S",
            piexif.GPSIFD.GPSLatitude: to_dms(lat),
            piexif.GPSIFD.GPSLongitudeRef: "E" if lon >= 0 else "W",
            piexif.GPSIFD.GPSLongitude: to_dms(lon),
            piexif.GPSIFD.GPSAltitude: (int(520 * 100), 100),
            piexif.GPSIFD.GPSAltitudeRef: 0,
        }
    stamp = when.strftime("%Y:%m:%d %H:%M:%S")
    exif = {
        "0th": {
            piexif.ImageIFD.Make: "DoLR-DRISHTI",
            piexif.ImageIFD.Model: device,
            piexif.ImageIFD.Software: "DRISHTI Geo-Tagging Module",
            piexif.ImageIFD.DateTime: stamp,
        },
        "Exif": {
            piexif.ExifIFD.DateTimeOriginal: stamp,
            piexif.ExifIFD.DateTimeDigitized: stamp,
            piexif.ExifIFD.PixelXDimension: 1024,
            piexif.ExifIFD.PixelYDimension: 768,
        },
        "GPS": gps,
    }
    return piexif.dump(exif)


# --------------------------------------------------------------------------- #
# Generators
# --------------------------------------------------------------------------- #
def generate_interventions(ws, grid, dem, ring, rng, count=10):
    """
    Site structures where a watershed committee actually would:

    * water-harvesting structures (check dam, percolation tank, gully plug)
      sit in the drainage lines / valley floors,
    * bunds and plantations sit on the mid-slopes,
    * farm ponds sit on individual fields (gentle ground),
    * everything is constrained to lie inside the micro-watershed boundary.
    """
    items = []
    types = ["check_dam", "plantation", "percolation_tank", "contour_bund",
             "farm_pond", "gully_plug", "check_dam", "plantation",
             "farm_pond", "contour_bund"]
    dem_n = (dem - dem.min()) / max(dem.max() - dem.min(), 1e-6)

    def _inside(lat, lon):
        # Ray-casting point-in-polygon on the boundary ring.
        x, y, inside = lon, lat, False
        for i in range(len(ring) - 1):
            x1, y1 = ring[i]
            x2, y2 = ring[i + 1]
            if ((y1 > y) != (y2 > y)) and (x < (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-12) + x1):
                inside = not inside
        return inside

    def _pick(itype):
        """Sample a location matching the site preference for this structure."""
        for _attempt in range(400):
            lat = float(rng.uniform(grid.min_lat + 0.0025, grid.max_lat - 0.0025))
            lon = float(rng.uniform(grid.min_lon + 0.0030, grid.max_lon - 0.0030))
            if not _inside(lat, lon):
                continue
            r = int(np.clip(grid.row_of(lat), 0, dem.shape[0] - 1))
            c = int(np.clip(grid.col_of(lon), 0, dem.shape[1] - 1))
            z = dem_n[r, c]
            if itype in ("check_dam", "percolation_tank", "gully_plug") and z < 0.30:
                return lat, lon
            if itype in ("contour_bund", "plantation") and 0.18 <= z <= 0.85:
                return lat, lon
            if itype == "farm_pond" and 0.10 <= z <= 0.70:
                return lat, lon
        return lat, lon

    for i in range(count):
        itype = types[i % len(types)]
        tmpl = INTERVENTION_TEMPLATES[itype]
        lat, lon = _pick(itype)
        install = dt.date(2024, 6, 1) + dt.timedelta(days=int(rng.integers(0, 330)))
        cost = int(rng.integers(*tmpl["cost"]) // 1000 * 1000)
        cap = round(float(rng.uniform(*tmpl["capacity"])), 2) if tmpl["capacity"][1] else 0.0
        items.append({
            "id": f"INT-{tmpl['code']}-{i + 1:03d}",
            "watershed_id": ws["id"],
            "name": f"{tmpl['label']} #{i + 1:03d}",
            "type": itype,
            "installation_date": install.isoformat(),
            "status": STATUS_POOL[int(rng.integers(0, len(STATUS_POOL)))],
            "cost_inr": cost,
            "capacity_tcm": cap,
            "latitude": round(lat, 6),
            "longitude": round(lon, 6),
            "village": ws["village"],
            "executing_agency": "Village Watershed Committee / GP",
            "beneficiaries": int(rng.integers(18, 140)),
        })
    return items


def generate_photos(ws, interventions, photos_dir, thumb_dir, rng):
    """Create geo-coded field photographs (including deliberately imperfect ones)."""
    os.makedirs(photos_dir, exist_ok=True)
    os.makedirs(thumb_dir, exist_ok=True)
    rows = []
    seq = 0

    plan = []
    for item in interventions:
        # One "during/after" photo per structure, plus a revisit for the big ones.
        plan.append((item, "after", "good"))
        if item["type"] in ("check_dam", "percolation_tank", "plantation", "farm_pond"):
            plan.append((item, "before", "good"))
    # Evidence-quality edge cases used to demo the validation engine.
    edge = [
        (interventions[0], "after", "blurred"),        # unusable - blurred
        (interventions[1], "after", "dark"),           # unusable - underexposed
        (interventions[2], "after", "no_gps"),         # no GPS in EXIF
        (interventions[3], "after", "far"),            # captured outside the buffer
        (interventions[0], "after", "duplicate"),      # same place, same day
    ]
    plan.extend(edge)

    for item, phase, quality in plan:
        seq += 1
        install = dt.date.fromisoformat(item["installation_date"])
        if phase == "before":
            when = install - dt.timedelta(days=int(rng.integers(20, 80)))
        else:
            when = dt.date(2026, 8, 1) - dt.timedelta(days=int(rng.integers(0, 420)))
            if when < install:
                when = install + dt.timedelta(days=int(rng.integers(5, 120)))

        green_frac = float(np.clip(rng.normal(0.34 if phase == "after" else 0.12, 0.08), 0.03, 0.72))
        if item["type"] == "plantation":
            green_frac = float(np.clip(green_frac + 0.22, 0.05, 0.85))
        water_frac = 0.0
        if item["type"] in ("check_dam", "percolation_tank", "farm_pond", "gully_plug"):
            water_frac = float(np.clip(rng.normal(0.34 if phase == "after" else 0.06, 0.07), 0.0, 0.6))

        img = render_field_photo(item["type"], green_frac, water_frac,
                                 quality if quality in ("blurred", "dark") else "good", rng)

        # Geometry: offset a few metres from the structure (inside the buffer),
        # except for the deliberate "far" case.
        offset_m = 22.0 if quality != "far" else 640.0
        m_lng, m_lat = metres_per_degree(item["latitude"])
        dlat = (rng.normal(0, offset_m) / m_lat)
        dlon = (rng.normal(0, offset_m) / m_lng)
        lat = round(item["latitude"] + dlat, 7)
        lon = round(item["longitude"] + dlon, 7)

        photo_id = f"IMG_{when.strftime('%Y%m%d')}_{seq:03d}"
        stamp = dt.datetime.combine(when, dt.time(int(rng.integers(8, 17)),
                                                  int(rng.integers(0, 59))))
        exif_bytes = make_exif_bytes(lat, lon, stamp, include_gps=(quality != "no_gps"))
        path = os.path.join(photos_dir, f"{photo_id}.jpg")
        if exif_bytes:
            img.save(path, "jpeg", exif=exif_bytes, quality=86)
        else:
            img.save(path, "jpeg", quality=86)

        # Thumbnail for the gallery.
        thumb = img.copy()
        thumb.thumbnail((360, 360), Image.LANCZOS)
        thumb.save(os.path.join(thumb_dir, f"{photo_id}.jpg"), "jpeg", quality=78)

        rows.append({
            "photo_id": photo_id,
            "watershed_id": ws["id"],
            "intervention_id": item["id"],
            "file_name": f"{photo_id}.jpg",
            "phase": phase,
            "type": item["type"],
            "latitude": "" if quality == "no_gps" else lat,
            "longitude": "" if quality == "no_gps" else lon,
            "timestamp": stamp.isoformat(),
            "expected_quality": {
                "blurred": "BLURRED", "dark": "UNDEREXPOSED", "no_gps": "MISSING_GPS",
                "far": "OUTSIDE_BUFFER", "duplicate": "ok",
            }.get(quality, "ok"),
            "notes": {
                "blurred": "Captured in low light - flagged automatically.",
                "dark": "Under-exposed evening capture.",
                "no_gps": "Geo-tag missing - device GPS was disabled.",
                "far": "Captured from the far bank - outside the 250 m buffer.",
                "duplicate": "Second capture of the same structure on the same visit.",
            }.get(quality, f"{phase.capitalize()} implementation evidence."),
        })
    return rows


def boundary_polygon(grid, rng, jitter=0.35):
    """Irregular micro-watershed outline inside the raster extent."""
    cx = (grid.min_lon + grid.max_lon) / 2
    cy = (grid.min_lat + grid.max_lat) / 2
    rx = (grid.max_lon - grid.min_lon) / 2 * (1.0 - jitter * 0.25)
    ry = (grid.max_lat - grid.min_lat) / 2 * (1.0 - jitter * 0.25)
    pts = []
    n = 48
    for i in range(n):
        t = 2 * math.pi * i / n
        wob = 1.0 + jitter * 0.18 * math.sin(3 * t + 0.7) + jitter * 0.10 * math.cos(5 * t)
        pts.append([round(cx + rx * wob * math.cos(t), 6), round(cy + ry * wob * math.sin(t), 6)])
    pts.append(pts[0])
    return pts


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main() -> int:
    print("=" * 74)
    print("  Watershed Insight - sample dataset generator (SIH PS26015)")
    print("=" * 74)

    for path in ("boundaries", "dem", "interventions", "metadata", "photos",
                 "satellite", "catalog", "overlays"):
        os.makedirs(os.path.join(DATA_DIR, path), exist_ok=True)
    thumb_dir = os.path.join(DATA_DIR, "photos", "thumbnails")

    catalog_states = {}
    catalog_ws = {}
    all_interventions = []
    all_photos = []

    for ws in WATERSHEDS:
        print(f"\n[{ws['id']}] {ws['name']}")
        lat0, lon0 = ws["centre"]
        span_lon, span_lat = ws["span_deg"]
        bounds = [lon0 - span_lon / 2, lat0 - span_lat / 2,
                  lon0 + span_lon / 2, lat0 + span_lat / 2]
        grid = RasterGrid(bounds, GRID, GRID)
        shape = (GRID, GRID)

        # ---- DEM ---------------------------------------------------------- #
        dem = build_dem(shape, grid, channel_lon=lon0 + 0.001, channel_lat=lat0)
        np.savez_compressed(os.path.join(DATA_DIR, "dem", f"{ws['id']}_dem.npz"),
                            elevation=dem, bounds=np.array(bounds))
        print(f"   DEM        {dem.shape}  relief {dem.max() - dem.min():.1f} m")

        # ---- boundary ----------------------------------------------------- #
        ring = boundary_polygon(grid, RNG)
        from geospatial.geo_utils import geojson_polygon_area_ha
        area_ha = geojson_polygon_area_ha({"type": "Polygon", "coordinates": [ring]})

        # ---- landscape & interventions ------------------------------------ #
        landscape = build_landscape(shape, dem, grid)
        interventions = generate_interventions(ws, grid, dem, ring, RNG,
                                               count=10 if ws["id"].endswith("001") else 6)
        all_interventions.extend(interventions)
        boundary = {
            "type": "Feature",
            "properties": {
                "id": ws["id"], "code": ws["code"], "name": ws["name"],
                "state": ws["state"], "district": ws["district"], "block": ws["block"],
                "area_ha": round(area_ha, 2), "project": ws["project"],
                "village": ws["village"], "rainfall_mm": ws["rainfall_mm"],
                "soil": ws["soil"], "aquifer": ws["aquifer"],
                "population": ws["population"], "households": ws["households"],
            },
            "geometry": {"type": "Polygon", "coordinates": [ring]},
        }
        with open(os.path.join(DATA_DIR, "boundaries", f"{ws['id']}.geojson"), "w") as fh:
            json.dump(boundary, fh, indent=2)
        print(f"   Boundary   {area_ha:,.1f} ha")

        # ---- satellite epochs ---------------------------------------------- #
        ws_sat = os.path.join(DATA_DIR, "satellite", ws["id"])
        os.makedirs(ws_sat, exist_ok=True)
        for epoch in EPOCHS:
            epoch_dir = os.path.join(ws_sat, epoch["key"])
            os.makedirs(epoch_dir, exist_ok=True)
            bands = epoch_bands(shape, grid, landscape, interventions, epoch, dem)
            np.savez_compressed(os.path.join(epoch_dir, "bands.npz"),
                                **{k: v.astype("float32") for k, v in bands.items()},
                                bounds=np.array(bounds))

            ndvi = (bands["nir"] - bands["red"]) / np.maximum(bands["nir"] + bands["red"], 1e-6)
            ndwi = (bands["green"] - bands["nir"]) / np.maximum(bands["green"] + bands["nir"], 1e-6)
            ndbi = (bands["swir"] - bands["nir"]) / np.maximum(bands["swir"] + bands["nir"], 1e-6)

            # Preview PNGs (also used as Leaflet overlays).
            from geospatial import mapping
            mapping.save_index_overlay(ndvi, grid, os.path.join(epoch_dir, "ndvi.png"), "ndvi")
            mapping.save_index_overlay(ndwi, grid, os.path.join(epoch_dir, "ndwi.png"), "ndwi")
            lulc = classify(ndvi, ndwi, ndbi, grid=grid, epoch_key=epoch["key"])
            mapping.save_lulc_overlay(lulc.classes, os.path.join(epoch_dir, "lulc.png"))

            # Natural-colour composite.
            rgb = np.dstack([bands["red"], bands["green"], np.clip(bands["nir"] * 0.6, 0, 1)])
            rgb = np.clip(rgb / np.percentile(rgb, 99), 0, 1) ** 0.85
            Image.fromarray((rgb * 255).astype("uint8")).save(os.path.join(epoch_dir, "rgb.png"))
            print(f"   Epoch {epoch['date']}  NDVI {ndvi.mean():+.3f}  NDWI {ndwi.mean():+.3f}")

        with open(os.path.join(ws_sat, "manifest.json"), "w") as fh:
            json.dump({"watershed_id": ws["id"], "bounds": bounds,
                       "grid": {"height": GRID, "width": GRID},
                       "sensor": "Sentinel-2 MSI L2A (synthetic surrogate)",
                       "epochs": EPOCHS}, fh, indent=2)

        # Change-delta preview (T1 - T0)
        from geospatial import mapping as _m
        t0 = np.load(os.path.join(ws_sat, "before", "bands.npz"))
        t1 = np.load(os.path.join(ws_sat, "after", "bands.npz"))
        ndvi0 = (t0["nir"] - t0["red"]) / np.maximum(t0["nir"] + t0["red"], 1e-6)
        ndvi1 = (t1["nir"] - t1["red"]) / np.maximum(t1["nir"] + t1["red"], 1e-6)
        _m.save_index_overlay(ndvi1 - ndvi0, grid, os.path.join(ws_sat, "after", "ndvi_delta.png"), "delta")
        ndwi0 = (t0["green"] - t0["nir"]) / np.maximum(t0["green"] + t0["nir"], 1e-6)
        ndwi1 = (t1["green"] - t1["nir"]) / np.maximum(t1["green"] + t1["nir"], 1e-6)
        _m.save_index_overlay(ndwi1 - ndwi0, grid, os.path.join(ws_sat, "after", "ndwi_delta.png"), "delta")
        _m.save_hillshade_overlay(dem, grid, os.path.join(ws_sat, "hillshade.png"))

        # ---- photos -------------------------------------------------------- #
        rows = generate_photos(ws, interventions, os.path.join(DATA_DIR, "photos"), thumb_dir, RNG)
        all_photos.extend(rows)
        print(f"   Photos     {len(rows)} geo-coded field photographs")

        # ---- catalog ------------------------------------------------------- #
        catalog_ws[ws["id"]] = {
            **{k: ws[k] for k in ("id", "code", "name", "state", "state_code", "district",
                                  "district_code", "block", "block_code", "project",
                                  "village", "rainfall_mm", "soil", "aquifer",
                                  "population", "households")},
            "area_ha": round(area_ha, 2),
            "centre": ws["centre"],
            "bounds": bounds,
            "interventions": len(interventions),
            "photos": len(rows),
            "epochs": [{"key": e["key"], "date": e["date"], "label": e["label"],
                        "role": e["role"], "season": e["season"]} for e in EPOCHS],
        }
        st = catalog_states.setdefault(ws["state_code"], {"code": ws["state_code"],
                                                          "name": ws["state"], "districts": {}})
        di = st["districts"].setdefault(ws["district_code"], {"code": ws["district_code"],
                                                              "name": ws["district"], "blocks": {}})
        bl = di["blocks"].setdefault(ws["block_code"], {"code": ws["block_code"],
                                                        "name": ws["block"], "watersheds": []})
        bl["watersheds"].append(ws["id"])

    # ---- write catalog ---------------------------------------------------- #
    def _tree(states):
        out = []
        for st in states.values():
            districts = []
            for di in st["districts"].values():
                blocks = []
                for bl in di["blocks"].values():
                    blocks.append({"code": bl["code"], "name": bl["name"],
                                   "watersheds": [
                                       {"id": wid, "code": catalog_ws[wid]["code"],
                                        "name": catalog_ws[wid]["name"],
                                        "area_ha": catalog_ws[wid]["area_ha"],
                                        "interventions": catalog_ws[wid]["interventions"]}
                                       for wid in bl["watersheds"]]})
                districts.append({"code": di["code"], "name": di["name"], "blocks": blocks})
            out.append({"code": st["code"], "name": st["name"], "districts": districts})
        return out

    catalog = {
        "generated_at": dt.datetime.now().isoformat(timespec="seconds"),
        "problem_statement": "SIH PS26015",
        "note": "Synthetic surrogate of the SRISHTI (satellite) and DRISHTI (geo-tagged photo) stacks.",
        "hierarchy": _tree(catalog_states),
        "watersheds": catalog_ws,
    }
    with open(os.path.join(DATA_DIR, "catalog", "watersheds.json"), "w") as fh:
        json.dump(catalog, fh, indent=2)

    # ---- interventions GeoJSON -------------------------------------------- #
    fc = {"type": "FeatureCollection", "features": []}
    for item in all_interventions:
        fc["features"].append({
            "type": "Feature",
            "properties": item,
            "geometry": {"type": "Point", "coordinates": [item["longitude"], item["latitude"]]},
        })
    with open(os.path.join(DATA_DIR, "interventions", "interventions.geojson"), "w") as fh:
        json.dump(fc, fh, indent=2)

    # ---- photos CSV -------------------------------------------------------- #
    with open(os.path.join(DATA_DIR, "metadata", "photos.csv"), "w", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(all_photos[0].keys()))
        writer.writeheader()
        writer.writerows(all_photos)

    print("\n" + "-" * 74)
    print(f"  Interventions : {len(all_interventions)}")
    print(f"  Photos        : {len(all_photos)}")
    print(f"  Watersheds    : {len(catalog_ws)}")
    print("  Sample dataset generated successfully.")
    print("-" * 74)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
