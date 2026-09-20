"""
lulc.py
=======
Rule-based Land Use / Land Cover (LULC) classification and change accounting.

The classifier combines three spectral indices that are routinely derived from
Sentinel-2 / Landsat surface reflectance:

* **NDVI**  - vegetation vigour / canopy density
* **NDWI**  - surface water presence (McFeeters, 1996)
* **NDBI**  - built-up & bare/hardpan signature (SWIR based)

A decision tree assigns every pixel to one of the Level-2 LULC classes used in
watershed monitoring, and the module then produces the *transition matrix*
(T0 -> T1) that the platform shows as "what turned into what".
"""

from __future__ import annotations

from dataclasses import dataclass, field
import json
import os
from typing import Dict, List, Optional, Tuple

import numpy as np

from .geo_utils import RasterGrid, safe_div

# --------------------------------------------------------------------------- #
# Class dictionary (codes are stable - they are persisted in reports & tests)
# --------------------------------------------------------------------------- #
CLASS_CODES = {
    0: ("no_data", "No Data / Cloud Mask", "#6b7280"),
    1: ("water", "Water Body / Surface Storage", "#1d4ed8"),
    2: ("dense_vegetation", "Dense Vegetation / Plantation", "#15803d"),
    3: ("cropland", "Cropland / Moderate Vegetation", "#65a30d"),
    4: ("scrub", "Scrub / Degraded Land", "#d97706"),
    5: ("bare", "Bare / Fallow Land", "#a16207"),
    6: ("builtup", "Built-up / Hardpan", "#57534e"),
}

CODE_BY_NAME = {v[0]: k for k, v in CLASS_CODES.items()}

# --------------------------------------------------------------------------- #
# Thresholds
# --------------------------------------------------------------------------- #
# These are *data*, not code.  A dataset may override any of them with a
# ``calibration.json`` next to its catalog (see ``load_calibration``), because
# the correct cut-off depends on the sensor, the season and the terrain.
#
# The defaults below were recalibrated after the first real Sentinel-2 AOI
# (Ralegaon Siddhi, Deccan basalt, pre-monsoon): dry fallow basalt sits at
# NDBI ~ +0.10..+0.18 with NDVI < 0.15, so the textbook "NDBI > 0.02 = built-up"
# rule labelled 65 % of a rural watershed as settlement.  Built-up / hardpan is
# now taken from the > 0.20 NDBI tail, and the remaining low-NDVI pixels fall
# through to bare / fallow.  See docs/CALIBRATION.md for the measured
# distributions that justify each number.
DEFAULT_THRESHOLDS: Dict[str, float] = {
    "water_ndwi": 0.20,        # McFeeters NDWI > 0.20 -> surface water
    "water_fallback_ndwi": 0.05,  # ... or NDWI > 0.05 on non-vegetated pixels
    "ndvi_dense": 0.50,        # dense canopy / plantation
    "ndvi_crop": 0.30,         # cropland / moderate vegetation
    "ndvi_scrub": 0.15,        # scrub / degraded land
    "ndbi_builtup": 0.20,      # built-up / hardpan tail (see calibration note)
}

# Backwards-compatible module constants (imported elsewhere).
WATER_NDWI = DEFAULT_THRESHOLDS["water_ndwi"]
WATER_FALLBACK_NDWI = DEFAULT_THRESHOLDS["water_fallback_ndwi"]
NDVI_DENSE = DEFAULT_THRESHOLDS["ndvi_dense"]
NDVI_CROP = DEFAULT_THRESHOLDS["ndvi_crop"]
NDVI_SCRUB = DEFAULT_THRESHOLDS["ndvi_scrub"]
NDBI_BUILTUP = DEFAULT_THRESHOLDS["ndbi_builtup"]


def resolve_thresholds(thresholds: Optional[Dict[str, float]] = None) -> Dict[str, float]:
    """Merge a dataset override onto the defaults (unknown keys ignored)."""
    merged = dict(DEFAULT_THRESHOLDS)
    if thresholds:
        merged.update({k: float(v) for k, v in thresholds.items()
                       if k in DEFAULT_THRESHOLDS})
    return merged


def load_calibration(data_dir: str) -> Dict[str, float]:
    """
    Read ``<data_dir>/calibration.json`` if present.

    Real deployments should calibrate thresholds against their own terrain
    rather than trusting defaults derived from another landscape.
    """
    path = os.path.join(data_dir, "calibration.json")
    if not os.path.exists(path):
        return dict(DEFAULT_THRESHOLDS)
    try:
        with open(path, "r", encoding="utf-8") as fh:
            raw = json.load(fh)
    except (OSError, ValueError):
        return dict(DEFAULT_THRESHOLDS)
    return resolve_thresholds(raw.get("thresholds", {}))


@dataclass
class LulcResult:
    classes: np.ndarray
    grid: Optional[RasterGrid] = None
    epoch_key: str = ""

    def area_by_class_ha(self, pixel_area_ha: np.ndarray,
                         mask: Optional[np.ndarray] = None) -> Dict[str, float]:
        """Hectares per class (optionally restricted to a buffer mask)."""
        area = np.broadcast_to(pixel_area_ha, self.classes.shape)
        data = self.classes if mask is None else np.where(mask, self.classes, -1)
        out = {name: 0.0 for _, (name, _, _) in sorted(CLASS_CODES.items())}
        for code in np.unique(data):
            code = int(code)
            if code < 0:
                continue
            key = CLASS_CODES.get(code, (f"class_{code}",))[0]
            out[key] = round(float(area[data == code].sum()), 3)
        return out

    def share_by_class_pct(self, pixel_area_ha: np.ndarray,
                           mask: Optional[np.ndarray] = None) -> Dict[str, float]:
        areas = self.area_by_class_ha(pixel_area_ha, mask)
        total = sum(areas.values())
        return {k: round(safe_div(v, total) * 100, 2) for k, v in areas.items()}

    def legend(self) -> List[dict]:
        return [
            {"code": code, "key": key, "label": label, "color": color}
            for code, (key, label, color) in sorted(CLASS_CODES.items())
            if code != 0
        ]


def classify(ndvi: np.ndarray, ndwi: np.ndarray, ndbi: Optional[np.ndarray] = None,
             grid: Optional[RasterGrid] = None, epoch_key: str = "",
             thresholds: Optional[Dict[str, float]] = None) -> LulcResult:
    """Apply the Level-2 decision tree and return an integer class raster."""
    t = resolve_thresholds(thresholds)
    ndvi = np.asarray(ndvi, dtype="float32")
    ndwi = np.asarray(ndwi, dtype="float32")
    ndbi = np.asarray(ndbi, dtype="float32") if ndbi is not None else np.zeros_like(ndvi)

    out = np.full(ndvi.shape, 6, dtype="uint8")          # default: built-up/hardpan
    out = np.where(ndvi >= t["ndvi_scrub"], 4, out)      # scrub / degraded
    out = np.where(ndvi >= t["ndvi_crop"], 3, out)       # cropland
    out = np.where(ndvi >= t["ndvi_dense"], 2, out)      # dense vegetation
    # Low-NDVI pixels: bright exposed soil stays "bare"; only the strongly
    # positive NDBI tail (hardpan / settlement) becomes "built-up".
    out = np.where((ndvi < t["ndvi_scrub"]) & (ndbi < t["ndbi_builtup"]), 5, out)
    out = np.where(ndwi > t["water_ndwi"], 1, out)       # water
    out = np.where((ndwi > t["water_fallback_ndwi"])
                   & (ndvi < t["ndvi_scrub"]), 1, out)
    out = np.where(np.isnan(ndvi) | np.isnan(ndwi), 0, out)
    return LulcResult(classes=out.astype("uint8"), grid=grid, epoch_key=epoch_key)


def transition_matrix(t0: LulcResult, t1: LulcResult,
                      pixel_area_ha: np.ndarray,
                      mask: Optional[np.ndarray] = None) -> dict:
    """
    Cross-tabulation of LULC classes between two epochs.

    Returns hectares + percentage shares for every ``from -> to`` pair so the
    dashboard can render "12.4 ha of bare land became cropland".
    """
    a = t0.classes if mask is None else np.where(mask, t0.classes, 255)
    b = t1.classes if mask is None else np.where(mask, t1.classes, 255)
    area = np.broadcast_to(pixel_area_ha, a.shape)

    codes = sorted(CLASS_CODES)
    matrix: Dict[str, Dict[str, float]] = {
        CLASS_CODES[c][0]: {CLASS_CODES[d][0]: 0.0 for d in codes} for c in codes
    }
    for c in codes:
        for d in codes:
            sel = (a == c) & (b == d)
            if np.any(sel):
                matrix[CLASS_CODES[c][0]][CLASS_CODES[d][0]] = round(float(area[sel].sum()), 3)

    total = sum(sum(row.values()) for row in matrix.values())

    # Persistent vs changed area (diagonal = unchanged).
    unchanged = sum(matrix[CLASS_CODES[c][0]][CLASS_CODES[c][0]] for c in codes)
    changed = max(total - unchanged, 0.0)

    # Named transitions sorted by magnitude (excluding the diagonal).
    transitions: List[dict] = []
    for c in codes:
        for d in codes:
            if c == d:
                continue
            ha = matrix[CLASS_CODES[c][0]][CLASS_CODES[d][0]]
            if ha > 0.005:
                transitions.append({
                    "from": CLASS_CODES[c][0],
                    "to": CLASS_CODES[d][0],
                    "from_label": CLASS_CODES[c][1],
                    "to_label": CLASS_CODES[d][1],
                    "area_ha": round(ha, 3),
                    "pct_of_area": round(safe_div(ha, total) * 100, 2),
                    "direction": "improvement" if _ecological_rank(d) > _ecological_rank(c)
                    else ("degradation" if _ecological_rank(d) < _ecological_rank(c) else "lateral"),
                })
    transitions.sort(key=lambda x: x["area_ha"], reverse=True)

    return {
        "matrix_ha": matrix,
        "total_area_ha": round(total, 3),
        "unchanged_area_ha": round(unchanged, 3),
        "changed_area_ha": round(changed, 3),
        "changed_pct": round(safe_div(changed, total) * 100, 2),
        "top_transitions": transitions[:12],
        "class_order": [CLASS_CODES[c][0] for c in codes if c != 0],
    }


def _ecological_rank(code: int) -> int:
    """Rough hydrological/ecological desirability ranking for change direction."""
    return {6: 0, 5: 1, 4: 2, 1: 3, 3: 4, 2: 5, 0: 0}.get(code, 0)


def stacked_area_table(t0: LulcResult, t1: LulcResult,
                       pixel_area_ha: np.ndarray,
                       mask: Optional[np.ndarray] = None) -> List[dict]:
    """Per-class T0 / T1 / delta table used by charts and the PDF report."""
    a0 = t0.area_by_class_ha(pixel_area_ha, mask)
    a1 = t1.area_by_class_ha(pixel_area_ha, mask)
    rows = []
    for code, (key, label, color) in sorted(CLASS_CODES.items()):
        if code == 0:
            continue
        before, after = a0.get(key, 0.0), a1.get(key, 0.0)
        rows.append({
            "code": code, "key": key, "label": label, "color": color,
            "t0_ha": round(before, 3), "t1_ha": round(after, 3),
            "delta_ha": round(after - before, 3),
            "delta_pct": round(safe_div(after - before, before) * 100, 1) if before else None,
        })
    return rows
