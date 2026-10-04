#!/usr/bin/env python3
"""
generate_demo_assets.py
=======================
Regenerates the frontend demo assets that back the landing-page visuals, so
every pixel shown in the UI is derived from the real watershed dataset instead
of a filtered stock photo.

Products (written under ``frontend/public/``):

* ``overlays/watershed_001_ndvi_before.png`` / ``..._after.png``
    Computed NDVI rasters for the T0 baseline epoch (2024-05-28) and the T1
    latest epoch (2026-05-26) - the two frames of the before/after slider.

* ``terrain/satellite.png``
    False-colour (NIR-R-G) composite built directly from the Sentinel-2 band
    stack of the latest epoch - the default 3D terrain texture.

* ``terrain/ndvi.png``, ``terrain/ndwi.png``, ``terrain/lulc.png``,
  ``terrain/delta.png``
    Opaque 512x512 terrain textures for the 3D spectral layer switcher,
    rendered from the same rasters the Web-GIS drapes over the basemap.

Run from the repository root::

    python scripts/generate_demo_assets.py

The script is deterministic and depends only on the committed sample dataset
plus the pure-NumPy geospatial pipeline in ``geospatial/``.
"""

from __future__ import annotations

import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.services.store import get_store          # noqa: E402
from geospatial.mapping import INDEX_RANGES, PALETTES, _cmap, normalise  # noqa: E402

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(REPO_ROOT, "frontend", "public")
TERRAIN_DIR = os.path.join(PUBLIC_DIR, "terrain")
OVERLAY_DIR = os.path.join(PUBLIC_DIR, "overlays")

WATERSHED_ID = "watershed_001"
TEX_SIZE = 512          # power-of-two texture for the WebGL terrain mesh
DARK_BASE = (7, 13, 25)  # matches the slider viewport background (#070d19)


def _percentile_stretch(band: np.ndarray, lo_pct: float = 2.0, hi_pct: float = 98.0) -> np.ndarray:
    """Linear 2-98 percentile stretch of a single band to 0..255."""
    lo, hi = np.percentile(band, [lo_pct, hi_pct])
    if hi <= lo:
        hi = lo + 1e-6
    return np.clip((band - lo) / (hi - lo) * 255.0, 0, 255).astype(np.uint8)


def _satellite_cir_composite(store, epoch_key: str) -> Image.Image:
    """False-colour NIR-R-G composite from the raw band stack (no blue band)."""
    bands = store.processor(WATERSHED_ID).get_epoch(epoch_key).bands
    r = _percentile_stretch(np.asarray(bands["nir"], dtype="float64"))   # NIR -> red
    g = _percentile_stretch(np.asarray(bands["red"], dtype="float64"))   # red -> green
    b = _percentile_stretch(np.asarray(bands["green"], dtype="float64"))  # green -> blue
    rgb = np.dstack([r, g, b])
    return Image.fromarray(rgb, "RGB").resize((TEX_SIZE, TEX_SIZE), Image.LANCZOS)


def _index_raster(store, name: str, epoch_key: str) -> np.ndarray:
    """Fetch the raw index/LULC array for a layer (same source as the overlays)."""
    proc = store.processor(WATERSHED_ID)
    if name == "lulc":
        return store.lulc(WATERSHED_ID, epoch_key).classes
    if name == "delta":
        return proc.index(proc.t1_key, "ndvi") - proc.index(proc.t0_key, "ndvi")
    return proc.index(epoch_key, name)


def _render_layer_png(array: np.ndarray, name: str) -> Image.Image:
    """Render an index/LULC array to RGBA with the Web-GIS palette."""
    if name == "lulc":
        from matplotlib.colors import to_rgb
        from geospatial.lulc import CLASS_CODES
        h, w = array.shape
        rgba = np.zeros((h, w, 4), dtype=np.uint8)
        for code, (_key, _label, color) in CLASS_CODES.items():
            if code == 0:
                continue
            rgb = to_rgb(color)
            sel = array == code
            rgba[sel, 0] = int(rgb[0] * 255)
            rgba[sel, 1] = int(rgb[1] * 255)
            rgba[sel, 2] = int(rgb[2] * 255)
            rgba[sel, 3] = 255
        return Image.fromarray(rgba, "RGBA")
    lo, hi = INDEX_RANGES.get(name, (-0.2, 0.9))
    norm = normalise(np.asarray(array, dtype="float64"), lo, hi)
    rgba = (_cmap(name if name in PALETTES else "delta")(norm) * 255).astype("uint8")
    rgba[..., 3] = 255
    return Image.fromarray(rgba, "RGBA")


def _flatten_on_dark(img: Image.Image) -> Image.Image:
    """Composite a (possibly transparent) raster onto the dark viewport base."""
    img = img.resize((TEX_SIZE, TEX_SIZE), Image.LANCZOS)
    base = Image.new("RGBA", (TEX_SIZE, TEX_SIZE), DARK_BASE + (255,))
    base.alpha_composite(img.convert("RGBA"))
    return base.convert("RGB")


def main() -> None:
    os.makedirs(TERRAIN_DIR, exist_ok=True)
    os.makedirs(OVERLAY_DIR, exist_ok=True)
    store = get_store()

    # --- sanity: the watershed and its epochs must exist ------------------- #
    proc = store.processor(WATERSHED_ID)
    t0_key, t1_key = proc.t0_key, proc.t1_key
    print(f"watershed {WATERSHED_ID}: T0={t0_key}  T1={t1_key}")

    # --- 1. before/after slider frames (computed NDVI per epoch) ----------- #
    for epoch_key, fname in ((t0_key, "watershed_001_ndvi_before.png"),
                             (t1_key, "watershed_001_ndvi_after.png")):
        raster = _index_raster(store, "ndvi", epoch_key)
        img = _flatten_on_dark(_render_layer_png(raster, "ndvi"))
        out = os.path.join(OVERLAY_DIR, fname)
        img.save(out, optimize=True)
        print(f"  wrote {os.path.relpath(out, REPO_ROOT)}  (NDVI mean {np.nanmean(raster):+.3f})")

    # --- 2. 3D terrain textures per spectral layer -------------------------- #
    layers = {
        "satellite": _satellite_cir_composite(store, t1_key),
        "ndvi": _flatten_on_dark(_render_layer_png(_index_raster(store, "ndvi", t1_key), "ndvi")),
        "ndwi": _flatten_on_dark(_render_layer_png(_index_raster(store, "ndwi", t1_key), "ndwi")),
        "lulc": _flatten_on_dark(_render_layer_png(_index_raster(store, "lulc", t1_key), "lulc")),
        "delta": _flatten_on_dark(_render_layer_png(_index_raster(store, "delta", t1_key), "delta")),
    }
    for name, img in layers.items():
        out = os.path.join(TERRAIN_DIR, f"{name}.png")
        img.save(out, optimize=True)
        print(f"  wrote {os.path.relpath(out, REPO_ROOT)}")

    # --- 3. real stats echoed for the UI copy ------------------------------- #
    stats = store.watershed_stats(WATERSHED_ID)
    print("\nreal watershed stats for UI copy:")
    print(f"  NDVI mean      {stats['ndvi_mean_t0']:.3f} -> {stats['ndvi_mean_t1']:.3f} "
          f"({stats['ndvi_change']:+.3f})")
    print(f"  water area     {stats['water_area_ha_t0']:.1f} -> {stats['water_area_ha_t1']:.1f} ha "
          f"({stats['water_area_change_ha']:+.2f})")
    print(f"  veg area       {stats['veg_area_ha_t0']:.1f} -> {stats['veg_area_ha_t1']:.1f} ha "
          f"({stats['veg_area_change_ha']:+.1f})")
    print(f"  structures     {stats['interventions']}   photos {stats['photos']} "
          f"({stats['photos_verified']} verified)")
    print("\nDone. Landing-page and 3D visuals now derive from the real dataset.")


if __name__ == "__main__":
    main()
