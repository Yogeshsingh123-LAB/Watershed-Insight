"""
raster_processor.py
===================
Multi-temporal raster engine for the Watershed Insight platform (SIH PS26015).

Responsibilities
----------------
* Load the per-epoch satellite band stacks produced by
  ``scripts/generate_sample_data.py`` (or by a real Sentinel-2 / Landsat
  ingestion adapter) and derive the spectral indices used by the platform.
* Provide *georeferenced* windowing: latitude/longitude -> pixel, ground-true
  circular buffers and area-weighted zonal statistics (hectares).
* Expose multi-epoch (time-series) profiles for monsoon / intervention
  response analysis.

Design notes
------------
The engine deliberately uses NumPy only (no GDAL/rasterio requirement) so the
platform can be deployed on low-cost infrastructure.  Everything is expressed
in physical units (metres, hectares) rather than pixels, so results remain
defensible in an administrative / audit context.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

from .geo_utils import (
    RasterGrid,
    circular_mask,
    describe,
    pct_change,
    safe_div,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data", "sample")

# Thresholds (documented in the PDF evidence pack so results stay auditable).
WATER_NDWI_THRESHOLD = 0.10      # NDWI > 0.10  -> surface water
DENSE_VEG_NDVI_THRESHOLD = 0.50  # NDVI > 0.50  -> dense canopy
VEG_NDVI_THRESHOLD = 0.30        # NDVI > 0.30  -> vegetated / crop cover


@dataclass
class Epoch:
    """One satellite observation date."""
    key: str                    # directory name, e.g. "before" / "after"
    date: str                   # ISO date, e.g. "2024-06-10"
    label: str                  # human label, e.g. "Pre-monsoon 2024 (T0)"
    role: str = "intermediate"  # "T0" | "T1" | "intermediate"
    season: str = ""
    cloud_cover_pct: float = 0.0
    sensor: str = "Sentinel-2 MSI (L2A)"

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "date": self.date,
            "label": self.label,
            "role": self.role,
            "season": self.season,
            "cloud_cover_pct": self.cloud_cover_pct,
            "sensor": self.sensor,
        }


@dataclass
class RasterStack:
    """Spectral bands + derived indices for a single epoch."""
    key: str
    date: str
    bands: Dict[str, np.ndarray] = field(default_factory=dict)
    grid: Optional[RasterGrid] = None

    # -- derived indices (computed lazily) --------------------------------- #
    _ndvi: Optional[np.ndarray] = None
    _ndwi: Optional[np.ndarray] = None
    _ndbi: Optional[np.ndarray] = None
    _savi: Optional[np.ndarray] = None

    @property
    def ndvi(self) -> np.ndarray:
        if self._ndvi is None:
            self._ndvi = normalised_difference(self.bands["nir"], self.bands["red"])
        return self._ndvi

    @property
    def ndwi(self) -> np.ndarray:
        if self._ndwi is None:
            self._ndwi = normalised_difference(self.bands["green"], self.bands["nir"])
        return self._ndwi

    @property
    def ndbi(self) -> np.ndarray:
        if self._ndbi is None:
            self._ndbi = normalised_difference(self.bands["swir"], self.bands["nir"])
        return self._ndbi

    @property
    def savi(self) -> np.ndarray:
        """Soil-Adjusted Vegetation Index (L = 0.5) - robust on sparse cover."""
        if self._savi is None:
            nir, red = self.bands["nir"], self.bands["red"]
            self._savi = ((nir - red) / (nir + red + 0.5)) * 1.5
        return self._savi

    @property
    def shape(self) -> Tuple[int, int]:
        first = next(iter(self.bands.values()))
        return first.shape


def normalised_difference(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """(a - b) / (a + b) with a zero-denominator guard."""
    a = np.asarray(a, dtype="float32")
    b = np.asarray(b, dtype="float32")
    denom = a + b
    with np.errstate(divide="ignore", invalid="ignore"):
        out = np.where(np.abs(denom) < 1e-6, 0.0, (a - b) / np.where(denom == 0, 1.0, denom))
    return np.clip(out.astype("float32"), -1.0, 1.0)


class RasterProcessor:
    """
    Loads every epoch of a watershed and answers spatial questions about it.
    """

    def __init__(self, watershed_id: str = "watershed_001", data_dir: str = DATA_DIR):
        self.watershed_id = watershed_id
        self.data_dir = data_dir
        self.satellite_dir = os.path.join(data_dir, "satellite", watershed_id)

        if not os.path.isdir(self.satellite_dir):
            raise FileNotFoundError(
                f"No satellite stack for '{watershed_id}' at {self.satellite_dir}. "
                "Run: python scripts/generate_sample_data.py"
            )

        self.epochs: List[Epoch] = self._load_manifest()
        self.stacks: Dict[str, RasterStack] = {}
        for epoch in self.epochs:
            self.stacks[epoch.key] = self._load_stack(epoch)

        self.grid: RasterGrid = next(iter(self.stacks.values())).grid
        self.pixel_area_ha: np.ndarray = self.grid.pixel_area_ha()
        self._pixel_area_ha_mean = float(self.pixel_area_ha.mean())

        self.t0_key = next((e.key for e in self.epochs if e.role == "T0"), self.epochs[0].key)
        self.t1_key = next((e.key for e in self.epochs if e.role == "T1"), self.epochs[-1].key)
        self.t0 = self.stacks[self.t0_key]
        self.t1 = self.stacks[self.t1_key]

    # ------------------------------------------------------------------ #
    # Loading
    # ------------------------------------------------------------------ #
    def _load_manifest(self) -> List[Epoch]:
        manifest_path = os.path.join(self.satellite_dir, "manifest.json")
        if os.path.exists(manifest_path):
            with open(manifest_path, "r", encoding="utf-8") as fh:
                raw = json.load(fh)
            return [Epoch(**{k: v for k, v in item.items() if k in Epoch.__dataclass_fields__})
                    for item in raw.get("epochs", [])]

        # Fallback: discover epoch directories on disk.
        epochs: List[Epoch] = []
        for name in sorted(os.listdir(self.satellite_dir)):
            if os.path.isdir(os.path.join(self.satellite_dir, name)):
                role = {"before": "T0", "after": "T1"}.get(name, "intermediate")
                epochs.append(Epoch(key=name, date="1970-01-01", label=name, role=role))
        return epochs

    def _load_stack(self, epoch: Epoch) -> RasterStack:
        epoch_dir = os.path.join(self.satellite_dir, epoch.key)
        bands_path = os.path.join(epoch_dir, "bands.npz")

        if os.path.exists(bands_path):
            data = np.load(bands_path)
            bands = {name: data[name].astype("float32") for name in data.files if name != "bounds"}
            bounds = [float(v) for v in data["bounds"]]
        else:  # legacy layout: pre-computed indices only
            legacy = os.path.join(epoch_dir, f"rasters_{'t0' if epoch.role == 'T0' else 't1'}.npz")
            data = np.load(legacy)
            bands = {
                "red": np.full(data["ndvi"].shape, 0.10, dtype="float32"),
                "green": np.full(data["ndvi"].shape, 0.08, dtype="float32"),
                "nir": np.full(data["ndvi"].shape, 0.15, dtype="float32"),
                "swir": np.full(data["ndvi"].shape, 0.20, dtype="float32"),
            }
            bounds = [float(v) for v in data["bounds"]]
            stack = RasterStack(key=epoch.key, date=epoch.date, bands=bands,
                                grid=RasterGrid(bounds, *data["ndvi"].shape))
            stack._ndvi = data["ndvi"].astype("float32")
            stack._ndwi = data["ndwi"].astype("float32")
            return stack

        height, width = bands[next(iter(bands))].shape
        return RasterStack(key=epoch.key, date=epoch.date, bands=bands,
                           grid=RasterGrid(bounds, height, width))

    # ------------------------------------------------------------------ #
    # Basic accessors
    # ------------------------------------------------------------------ #
    def get_epoch(self, key: str) -> RasterStack:
        if key not in self.stacks:
            raise KeyError(f"Unknown epoch '{key}'. Available: {list(self.stacks)}")
        return self.stacks[key]

    def index(self, epoch_key: str, index_name: str) -> np.ndarray:
        """Return an index array (``ndvi`` | ``ndwi`` | ``ndbi`` | ``savi``)."""
        stack = self.get_epoch(epoch_key)
        return getattr(stack, index_name.lower())

    def bounds(self) -> List[float]:
        return list(self.grid.bounds)

    # ------------------------------------------------------------------ #
    # Whole-watershed statistics
    # ------------------------------------------------------------------ #
    def watershed_stats(self, mask: Optional[np.ndarray] = None) -> dict:
        """Headline indicators for the watershed (optionally clipped by ``mask``)."""
        area = np.broadcast_to(self.pixel_area_ha, self.t0.ndvi.shape)
        if mask is not None:
            area = area * mask
        stats = {}
        for name, stack in (("t0", self.t0), ("t1", self.t1)):
            water = (stack.ndwi > WATER_NDWI_THRESHOLD).astype("float32")
            veg = (stack.ndvi > VEG_NDVI_THRESHOLD).astype("float32")
            dense = (stack.ndvi > DENSE_VEG_NDVI_THRESHOLD).astype("float32")
            stats.update({
                f"ndvi_mean_{name}": round(float(np.average(stack.ndvi, weights=None)), 4),
                f"ndwi_mean_{name}": round(float(np.average(stack.ndwi, weights=None)), 4),
                f"water_area_ha_{name}": round(float(np.sum(water * area)), 2),
                f"veg_area_ha_{name}": round(float(np.sum(veg * area)), 2),
                f"dense_veg_area_ha_{name}": round(float(np.sum(dense * area)), 2),
            })

        ndvi_change = round(stats["ndvi_mean_t1"] - stats["ndvi_mean_t0"], 4)
        stats.update({
            "watershed_id": self.watershed_id,
            "ndvi_change": ndvi_change,
            "ndvi_change_pct": pct_change(stats["ndvi_mean_t0"], stats["ndvi_mean_t1"]),
            "water_area_change_ha": round(stats["water_area_ha_t1"] - stats["water_area_ha_t0"], 2),
            "veg_area_change_ha": round(stats["veg_area_ha_t1"] - stats["veg_area_ha_t0"], 2),
            "dense_veg_change_ha": round(stats["dense_veg_area_ha_t1"] - stats["dense_veg_area_ha_t0"], 2),
            "water_area_change_pct": pct_change(stats["water_area_ha_t0"], stats["water_area_ha_t1"]),
            "total_area_ha": round(float(np.sum(area)), 2),
            "epoch_t0": self.t0.date,
            "epoch_t1": self.t1.date,
        })
        return stats

    # ------------------------------------------------------------------ #
    # Buffers & zonal statistics
    # ------------------------------------------------------------------ #
    def buffer_mask(self, lat: float, lon: float, radius_m: float = 250.0) -> np.ndarray:
        """Ground-true circular buffer mask around a point."""
        return circular_mask(self.grid, lat, lon, radius_m)

    def zonal_stats(self, array: np.ndarray, mask: np.ndarray) -> dict:
        """Area-weighted statistics of ``array`` inside ``mask``."""
        if not np.any(mask):
            return {**describe(np.array([])), "area_ha": 0.0}
        area = np.broadcast_to(self.pixel_area_ha, array.shape)
        weights = area[mask]
        values = array[mask]
        return {
            **describe(values),
            "area_ha": round(float(weights.sum()), 3),
            "weighted_mean": round(float(np.average(values, weights=weights)), 4),
        }

    def class_area_ha(self, class_array: np.ndarray, mask: Optional[np.ndarray] = None) -> Dict[int, float]:
        """Hectares per integer class code (e.g. LULC) inside an optional mask."""
        area = np.broadcast_to(self.pixel_area_ha, class_array.shape)
        if mask is not None:
            class_array = np.where(mask, class_array, -1)
        out: Dict[int, float] = {}
        for code in np.unique(class_array):
            code_int = int(code)
            if code_int < 0:
                continue
            out[code_int] = round(float(area[class_array == code].sum()), 3)
        return out

    def analyse_buffer(self, lat: float, lon: float, radius_m: float = 250.0,
                       epoch_a: Optional[str] = None, epoch_b: Optional[str] = None) -> dict:
        """
        Full T0 -> T1 impact assessment inside a circular buffer.

        This is the analytical core of the platform: it quantifies what changed
        around an IWMP structure between the baseline and the latest observation.
        """
        key_a = epoch_a or self.t0_key
        key_b = epoch_b or self.t1_key
        a, b = self.get_epoch(key_a), self.get_epoch(key_b)
        mask = self.buffer_mask(lat, lon, radius_m)
        area = np.broadcast_to(self.pixel_area_ha, a.ndvi.shape)
        buf_area_ha = float(area[mask].sum())

        water_a = float(area[mask & (a.ndwi > WATER_NDWI_THRESHOLD)].sum())
        water_b = float(area[mask & (b.ndwi > WATER_NDWI_THRESHOLD)].sum())
        veg_a = float(area[mask & (a.ndvi > VEG_NDVI_THRESHOLD)].sum())
        veg_b = float(area[mask & (b.ndvi > VEG_NDVI_THRESHOLD)].sum())
        dense_a = float(area[mask & (a.ndvi > DENSE_VEG_NDVI_THRESHOLD)].sum())
        dense_b = float(area[mask & (b.ndvi > DENSE_VEG_NDVI_THRESHOLD)].sum())

        ndvi_a = float(np.average(a.ndvi[mask], weights=area[mask]))
        ndvi_b = float(np.average(b.ndvi[mask], weights=area[mask]))
        ndwi_a = float(np.average(a.ndwi[mask], weights=area[mask]))
        ndwi_b = float(np.average(b.ndwi[mask], weights=area[mask]))

        ndvi_delta = round(ndvi_b - ndvi_a, 4)
        water_delta = round(water_b - water_a, 3)
        veg_delta = round(veg_b - veg_a, 3)

        # --- inundation-aware vegetation response -------------------------- #
        # Newly impounded pixels turn vegetation into open water, which *lowers*
        # the buffer-mean NDVI even when the intervention is working perfectly.
        # The vegetation response is therefore also computed on land that was
        # neither water before nor after - this is the defensible comparison.
        land_mask = mask & (a.ndwi <= WATER_NDWI_THRESHOLD) & (b.ndwi <= WATER_NDWI_THRESHOLD)
        if np.any(land_mask):
            ndvi_land_a = float(np.average(a.ndvi[land_mask], weights=area[land_mask]))
            ndvi_land_b = float(np.average(b.ndvi[land_mask], weights=area[land_mask]))
            land_delta = round(ndvi_land_b - ndvi_land_a, 4)
        else:
            ndvi_land_a, ndvi_land_b, land_delta = ndvi_a, ndvi_b, ndvi_delta
        newly_inundated_ha = round(float(area[mask & (a.ndwi <= WATER_NDWI_THRESHOLD) &
                                              (b.ndwi > WATER_NDWI_THRESHOLD)].sum()), 3)

        degraded = float(area[mask & ((b.ndvi - a.ndvi) < -0.10)].sum())
        improved = float(area[mask & ((b.ndvi - a.ndvi) > 0.10)].sum())
        stable = float(area[mask & (np.abs(b.ndvi - a.ndvi) <= 0.10)].sum())

        interpretation, confidence, score = self._synthesise(
            ndvi_delta=ndvi_delta, ndvi_land_delta=land_delta, water_delta=water_delta,
            veg_delta=veg_delta, ndvi_before=ndvi_a, buffer_area_ha=buf_area_ha,
            improved_ha=improved, degraded_ha=degraded, radius_m=radius_m,
            newly_inundated_ha=newly_inundated_ha,
        )

        return {
            "buffer_radius_m": radius_m,
            "center": {"lat": lat, "lon": lon},
            "buffer_area_ha": round(buf_area_ha, 3),
            "pixel_count": int(mask.sum()),
            "epoch_a": {"key": key_a, "date": a.date},
            "epoch_b": {"key": key_b, "date": b.date},
            "ndvi_before": round(ndvi_a, 4),
            "ndvi_after": round(ndvi_b, 4),
            "ndvi_change": ndvi_delta,
            "ndvi_change_pct": pct_change(ndvi_a, ndvi_b),
            "ndwi_before": round(ndwi_a, 4),
            "ndwi_after": round(ndwi_b, 4),
            "ndwi_change": round(ndwi_b - ndwi_a, 4),
            "ndvi_before_land": round(ndvi_land_a, 4),
            "ndvi_after_land": round(ndvi_land_b, 4),
            "ndvi_change_land": land_delta,
            "newly_inundated_ha": newly_inundated_ha,
            "water_area_before_ha": round(water_a, 3),
            "water_area_after_ha": round(water_b, 3),
            "water_area_change_ha": water_delta,
            "water_area_change_pct": pct_change(water_a, water_b),
            "veg_area_before_ha": round(veg_a, 3),
            "veg_area_after_ha": round(veg_b, 3),
            "veg_area_change_ha": veg_delta,
            "dense_veg_before_ha": round(dense_a, 3),
            "dense_veg_after_ha": round(dense_b, 3),
            "dense_veg_change_ha": round(dense_b - dense_a, 3),
            "area_improved_ha": round(improved, 3),
            "area_degraded_ha": round(degraded, 3),
            "area_stable_ha": round(stable, 3),
            "improved_pct": round(safe_div(improved, buf_area_ha) * 100, 1),
            "degraded_pct": round(safe_div(degraded, buf_area_ha) * 100, 1),
            "impact_score": score,
            "interpretation": interpretation,
            "confidence": confidence,
        }

    # ------------------------------------------------------------------ #
    # Interpretation / decision support
    # ------------------------------------------------------------------ #
    @staticmethod
    def _synthesise(ndvi_delta: float, ndvi_land_delta: float, water_delta: float,
                    veg_delta: float, ndvi_before: float, buffer_area_ha: float,
                    improved_ha: float, degraded_ha: float, radius_m: float,
                    newly_inundated_ha: float = 0.0) -> Tuple[str, str, float]:
        """Turn raw deltas into an auditable narrative + 0-100 impact score.

        Scoring components (documented in the evidence pack):

        * **Vegetation response (0-40)** - NDVI change on land that stayed land,
          so new impoundments are not mistaken for vegetation loss.
        * **Water response (0-40)** - surface-water gain as a share of the buffer.
        * **Spatial extent (0-20)** - how much of the buffer actually improved.
        """
        veg_gain_pct = safe_div(veg_delta, buffer_area_ha) * 100
        water_gain_pct = safe_div(water_delta, buffer_area_ha) * 100
        ndvi_rel = pct_change(ndvi_before, ndvi_before + ndvi_land_delta)

        veg_component = float(np.clip(ndvi_land_delta * 170.0, -20.0, 40.0))
        water_component = float(np.clip(water_gain_pct * 1.5, -20.0, 45.0))
        extent_component = float(np.clip(safe_div(improved_ha, buffer_area_ha) * 45.0, -10.0, 20.0))
        score = float(np.clip(round(veg_component + water_component + extent_component, 1), 0, 100))

        inundation_note = (
            f" {newly_inundated_ha:.2f} ha of the buffer was converted to open water, "
            f"which explains part of the raw buffer-mean NDVI signal."
            if newly_inundated_ha > 0.05 else ""
        )

        if score >= 60 and (ndvi_land_delta > 0.03 or water_delta > 0.10):
            confidence = "High"
            interpretation = (
                f"High positive response. Excluding newly inundated ground, mean NDVI inside the "
                f"{int(radius_m)} m buffer rose {ndvi_land_delta:+.3f} ({ndvi_rel:+.0f} %), vegetated "
                f"cover expanded by {veg_delta:+.2f} ha ({veg_gain_pct:+.1f} % of the buffer) and "
                f"surface water extent grew by {water_delta:+.2f} ha.{inundation_note} The signature is "
                f"consistent with improved soil-moisture retention and recharge attributable to the "
                f"intervention."
            )
        elif score >= 42:
            confidence = "Moderate"
            interpretation = (
                f"Moderate positive response. Land NDVI improved {ndvi_land_delta:+.3f}, "
                f"{improved_ha:.2f} ha of the {buffer_area_ha:.2f} ha buffer greened up and surface "
                f"water changed by {water_delta:+.2f} ha.{inundation_note} Improvement is measurable "
                f"but partly attributable to seasonal rainfall; one further seasonal observation is "
                f"recommended before the asset is scored as fully effective."
            )
        elif score >= 25:
            confidence = "Low-Moderate"
            interpretation = (
                f"Marginal response. Land NDVI changed {ndvi_land_delta:+.3f} with {water_delta:+.2f} ha "
                f"of surface-water change inside the {int(radius_m)} m buffer.{inundation_note} The "
                f"spectral response is within seasonal noise - verify structure functionality through a "
                f"field visit."
            )
        else:
            confidence = "Inconclusive"
            interpretation = (
                f"No significant positive response detected. Land NDVI changed {ndvi_land_delta:+.3f} and "
                f"{degraded_ha:.2f} ha of the buffer shows a negative vegetation signal.{inundation_note} "
                f"Possible causes: siltation or non-functionality of the structure, a delayed monsoon, or "
                f"a zone of influence smaller than the {int(radius_m)} m analysis buffer. Flag for field "
                f"verification."
            )
        return interpretation, confidence, score

    # ------------------------------------------------------------------ #
    # Time series
    # ------------------------------------------------------------------ #
    def time_series(self, lat: Optional[float] = None, lon: Optional[float] = None,
                    radius_m: float = 250.0,
                    mask: Optional[np.ndarray] = None) -> List[dict]:
        """Per-epoch NDVI / NDWI / water-area profile (watershed, mask or buffer)."""
        if lat is not None and lon is not None:
            mask = self.buffer_mask(lat, lon, radius_m)
        area = np.broadcast_to(self.pixel_area_ha, self.t0.ndvi.shape)
        series = []
        for epoch in self.epochs:
            stack = self.stacks[epoch.key]
            if mask is None:
                ndvi = float(stack.ndvi.mean())
                ndwi = float(stack.ndwi.mean())
                water = float(area[stack.ndwi > WATER_NDWI_THRESHOLD].sum())
                veg = float(area[stack.ndvi > VEG_NDVI_THRESHOLD].sum())
            else:
                ndvi = float(np.average(stack.ndvi[mask], weights=area[mask]))
                ndwi = float(np.average(stack.ndwi[mask], weights=area[mask]))
                water = float(area[mask & (stack.ndwi > WATER_NDWI_THRESHOLD)].sum())
                veg = float(area[mask & (stack.ndvi > VEG_NDVI_THRESHOLD)].sum())
            series.append({
                "key": epoch.key,
                "date": epoch.date,
                "label": epoch.label,
                "season": epoch.season,
                "role": epoch.role,
                "ndvi": round(ndvi, 4),
                "ndwi": round(ndwi, 4),
                "water_area_ha": round(water, 3),
                "veg_area_ha": round(veg, 3),
            })
        return series

    # ------------------------------------------------------------------ #
    # Change detection
    # ------------------------------------------------------------------ #
    def change_detection(self, index_name: str = "ndvi",
                         epoch_a: Optional[str] = None,
                         epoch_b: Optional[str] = None,
                         mask: Optional[np.ndarray] = None) -> dict:
        """
        Pixel-wise change statistics between two epochs for one index.

        ``mask`` restricts the assessment (typically to the micro-watershed
        boundary) so areas outside the watershed are not counted.
        """
        key_a, key_b = epoch_a or self.t0_key, epoch_b or self.t1_key
        a = self.index(key_a, index_name)
        b = self.index(key_b, index_name)
        delta = (b - a).astype("float32")
        area = np.broadcast_to(self.pixel_area_ha, delta.shape)
        if mask is not None:
            area = area * mask

        bins = [(-1.01, -0.20, "large_decline"), (-0.20, -0.10, "decline"),
                (-0.10, 0.10, "stable"), (0.10, 0.20, "improvement"),
                (0.20, 1.01, "large_improvement")]
        classes = {}
        for low, high, name in bins:
            sel = (delta > low) & (delta <= high)
            classes[name] = {
                "area_ha": round(float(area[sel].sum()), 2),
                "pixels": int(sel.sum()),
                "pct_of_area": round(safe_div(float(area[sel].sum()), float(area.sum())) * 100, 1),
            }

        return {
            "index": index_name,
            "epoch_a": {"key": key_a, "date": self.get_epoch(key_a).date},
            "epoch_b": {"key": key_b, "date": self.get_epoch(key_b).date},
            "mean_before": round(float(a.mean()), 4),
            "mean_after": round(float(b.mean()), 4),
            "mean_delta": round(float(delta.mean()), 4),
            "std_delta": round(float(delta.std()), 4),
            "min_delta": round(float(delta.min()), 4),
            "max_delta": round(float(delta.max()), 4),
            "pct_improved_area": classes["improvement"]["pct_of_area"] + classes["large_improvement"]["pct_of_area"],
            "pct_degraded_area": classes["decline"]["pct_of_area"] + classes["large_decline"]["pct_of_area"],
            "change_classes": classes,
            "delta": delta,
        }

    def hotspots(self, index_name: str = "ndvi", top_n: int = 5) -> List[dict]:
        """
        Coarse 5x5 block aggregation used to point field teams at the areas with
        the strongest positive / negative change.
        """
        result = self.change_detection(index_name)
        delta = result["delta"]
        h, w = delta.shape
        bh, bw = max(h // 5, 1), max(w // 5, 1)
        blocks = []
        for r in range(0, h - bh + 1, bh):
            for c in range(0, w - bw + 1, bw):
                block = delta[r:r + bh, c:c + bw]
                lat = self.grid.lat_of(r + bh / 2 - 0.5)
                lon = self.grid.lon_of(c + bw / 2 - 0.5)
                blocks.append({
                    "lat": round(lat, 6), "lon": round(lon, 6),
                    "mean_delta": round(float(block.mean()), 4),
                    "area_ha": round(float(self.pixel_area_ha[r:r + bh, 0:1].sum() * bw), 2),
                })
        blocks.sort(key=lambda x: x["mean_delta"], reverse=True)
        return {"gainers": blocks[:top_n], "losers": blocks[-top_n:][::-1], "blocks": blocks}
