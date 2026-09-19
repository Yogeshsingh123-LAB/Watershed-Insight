"""
conftest.py - shared pytest fixtures.

The geospatial tests run against a *tiny synthetic* dataset generated in a
temporary directory so the unit tests are fast and independent of the shipped
sample data.  The API tests use the real dataset via FastAPI's TestClient.
"""

from __future__ import annotations

import os
import sys

# Keep the shipped sample dataset pristine: uploads performed by the tests are
# registered in memory only, never appended to data/sample/metadata/photos.csv.
os.environ.setdefault("WS_PERSIST_UPLOADS", "false")

import numpy as np  # noqa: E402
import pytest  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from geospatial.geo_utils import RasterGrid  # noqa: E402


@pytest.fixture(scope="session")
def tiny_dataset(tmp_path_factory):
    """
    A 40 x 40 synthetic watershed: flat-ish terrain with a diagonal channel,
    one vegetated patch and one water patch, at two epochs (T0 dry, T1 greener).
    """
    root = tmp_path_factory.mktemp("ws")
    ws = "test_ws"
    bounds = [75.30, 19.80, 75.32, 19.82]
    height = width = 40
    grid = RasterGrid(bounds, height, width)

    yy, xx = np.mgrid[0:height, 0:width]
    channel = np.abs(yy - xx) <= 1                       # diagonal drainage line
    veg_patch = ((yy - 10) ** 2 + (xx - 30) ** 2) < 25    # vegetation blob
    water_patch = ((yy - 30) ** 2 + (xx - 10) ** 2) < 12  # water body

    def bands(green_boost: float, water_boost: float):
        red = np.full((height, width), 0.26, dtype="float32")
        green = np.full((height, width), 0.19, dtype="float32")
        nir = np.full((height, width), 0.28, dtype="float32")
        swir = np.full((height, width), 0.34, dtype="float32")
        nir += green_boost * veg_patch
        red -= 0.20 * green_boost * veg_patch
        nir -= 0.44 * water_boost * water_patch
        green += 0.03 * water_boost * water_patch
        swir -= 0.40 * water_boost * water_patch
        return {
            "red": np.clip(red, 0.01, 0.9), "green": np.clip(green, 0.01, 0.9),
            "nir": np.clip(nir, 0.01, 0.9), "swir": np.clip(swir, 0.01, 0.9),
        }

    for key, (g_boost, w_boost) in {"before": (0.10, 0.10), "after": (0.85, 0.95)}.items():
        epoch_dir = os.path.join(root, "satellite", ws, key)
        os.makedirs(epoch_dir, exist_ok=True)
        np.savez_compressed(os.path.join(epoch_dir, "bands.npz"),
                            bounds=np.array(bounds), **bands(g_boost, w_boost))

    manifest = {
        "watershed_id": ws, "bounds": bounds, "grid": {"height": height, "width": width},
        "epochs": [
            {"key": "before", "date": "2024-05-28", "label": "T0", "role": "T0",
             "season": "pre_monsoon", "cloud_cover_pct": 1.0, "sensor": "test"},
            {"key": "after", "date": "2026-05-26", "label": "T1", "role": "T1",
             "season": "pre_monsoon", "cloud_cover_pct": 2.0, "sensor": "test"},
        ],
    }
    import json
    sat_dir = os.path.join(root, "satellite", ws)
    with open(os.path.join(sat_dir, "manifest.json"), "w") as fh:
        json.dump(manifest, fh)

    # A simple inclined plane with a carved channel: hydrology must route water
    # down-slope and concentrate it in the channel.
    dem = 500.0 + (height - yy) * 1.5 - 12.0 * np.exp(-((yy - xx) ** 2) / 6.0)
    os.makedirs(os.path.join(root, "dem"), exist_ok=True)
    np.savez_compressed(os.path.join(root, "dem", f"{ws}_dem.npz"),
                        elevation=dem.astype("float32"), bounds=np.array(bounds))

    return {
        "root": str(root),
        "watershed_id": ws,
        "grid": grid,
        "channel": channel,
        "veg_patch": veg_patch,
        "water_patch": water_patch,
        "bounds": bounds,
    }


@pytest.fixture(scope="session")
def sample_data_available():
    sample = os.path.join(BASE_DIR, "data", "sample")
    return os.path.exists(os.path.join(sample, "catalog", "watersheds.json"))
