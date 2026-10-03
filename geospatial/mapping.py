"""
mapping.py
==========
Raster / chart rendering utilities.

Two families of products are produced here:

1. **Web-GIS overlays** - transparent RGBA PNGs (NDVI, NDWI, change delta,
   LULC, hillshade) that Leaflet drapes over the satellite basemap.  They are
   generated on demand and cached, so the platform never ships stale maps.

2. **Report figures** - publication-quality matplotlib figures (location map,
   time-series profile, LULC comparison, intervention ranking) that are
   embedded in the PDF evidence packs.

Only NumPy + Pillow + matplotlib are required.
"""

from __future__ import annotations

import io
import os
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
from PIL import Image

import matplotlib
matplotlib.use("Agg")            # headless rendering (servers / containers)
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.colors import LinearSegmentedColormap  # noqa: E402

from .geo_utils import RasterGrid, normalise  # noqa: E402
from .lulc import CLASS_CODES  # noqa: E402


# --------------------------------------------------------------------------- #
# Palettes
# --------------------------------------------------------------------------- #
PALETTES = {
    "ndvi": ("#a50026", "#fdae61", "#ffffbf", "#a6d96a", "#1a9850"),
    "ndwi": ("#8c510a", "#dfc27d", "#f6e8c3", "#80cdc1", "#01665e"),
    "delta": ("#b2182b", "#f4a582", "#f7f7f7", "#92c5de", "#2166ac"),
    "terrain": ("#3b2f2f", "#8c6b4a", "#c2b280", "#8fbc8f", "#f5f5f5"),
    "lulc": ("#1d4ed8", "#15803d", "#65a30d", "#d97706", "#a16207", "#57534e"),
}

INDEX_RANGES = {
    "ndvi": (-0.2, 0.9),
    "ndwi": (-0.6, 0.8),
    "ndbi": (-0.5, 0.5),
    "savi": (-0.2, 0.9),
    "delta": (-0.35, 0.35),
}


def _cmap(name: str) -> LinearSegmentedColormap:
    return LinearSegmentedColormap.from_list(name, PALETTES.get(name, PALETTES["ndvi"]))


# --------------------------------------------------------------------------- #
# 1. Transparent web overlays
# --------------------------------------------------------------------------- #
def save_index_overlay(array: np.ndarray, grid: RasterGrid, out_path: str,
                       palette: str = "ndvi", vmin: Optional[float] = None,
                       vmax: Optional[float] = None, alpha: float = 0.78,
                       mask: Optional[np.ndarray] = None) -> str:
    """Render a continuous index raster as a transparent PNG overlay."""
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    lo, hi = INDEX_RANGES.get(palette, (float(np.nanmin(array)), float(np.nanmax(array))))
    vmin = lo if vmin is None else vmin
    vmax = hi if vmax is None else vmax

    norm = normalise(np.asarray(array, dtype="float64"), vmin, vmax)
    rgba = (_cmap(palette)(norm) * 255).astype("uint8")
    rgba[..., 3] = int(np.clip(alpha, 0, 1) * 255)
    if mask is not None:
        rgba[..., 3] = np.where(mask, rgba[..., 3], 0)
    Image.fromarray(rgba, "RGBA").save(out_path, optimize=True)
    return out_path


def save_lulc_overlay(classes: np.ndarray, out_path: str, alpha: float = 0.8,
                      mask: Optional[np.ndarray] = None) -> str:
    """Render a classified LULC raster as a transparent PNG overlay."""
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    h, w = classes.shape
    rgba = np.zeros((h, w, 4), dtype="uint8")
    for code, (_key, _label, color) in CLASS_CODES.items():
        if code == 0:
            continue
        sel = classes == code
        rgb = matplotlib.colors.to_rgb(color)
        rgba[sel, 0] = int(rgb[0] * 255)
        rgba[sel, 1] = int(rgb[1] * 255)
        rgba[sel, 2] = int(rgb[2] * 255)
        rgba[sel, 3] = int(alpha * 255)
    if mask is not None:
        rgba[..., 3] = np.where(mask, rgba[..., 3], 0)
    Image.fromarray(rgba, "RGBA").save(out_path, optimize=True)
    return out_path


def hillshade(dem: np.ndarray, grid: RasterGrid, azimuth: float = 315.0,
              altitude: float = 45.0) -> np.ndarray:
    """Standard hillshade (0..1) used as a terrain backdrop under overlays."""
    dzdy, dzdx = np.gradient(dem.astype("float64"))
    slope = np.arctan(np.hypot(dzdx, dzdy))
    aspect = np.arctan2(-dzdx, dzdy)
    az_rad, alt_rad = np.radians(azimuth), np.radians(altitude)
    shaded = (np.sin(alt_rad) * np.cos(slope) +
              np.cos(alt_rad) * np.sin(slope) * np.cos(az_rad - aspect))
    return np.clip((shaded + 1) / 2, 0, 1)


def save_hillshade_overlay(dem: np.ndarray, grid: RasterGrid, out_path: str,
                           alpha: float = 0.55, mask: Optional[np.ndarray] = None) -> str:
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    shade = hillshade(dem, grid)
    gray = (shade * 255).astype("uint8")
    rgba = np.dstack([gray, gray, gray, np.full(gray.shape, int(alpha * 255), dtype="uint8")])
    if mask is not None:
        rgba[..., 3] = np.where(mask, rgba[..., 3], 0)
    Image.fromarray(rgba, "RGBA").save(out_path, optimize=True)
    return out_path


# --------------------------------------------------------------------------- #
# 2. Report figures
# --------------------------------------------------------------------------- #
def _new_fig(figsize: Tuple[float, float] = (7.0, 4.0)):
    fig, ax = plt.subplots(figsize=figsize, dpi=170)
    fig.patch.set_facecolor("white")
    return fig, ax


def figure_location_map(index_array: np.ndarray, grid: RasterGrid, out_path: str,
                        title: str = "", palette: str = "ndvi",
                        interventions: Optional[Sequence[dict]] = None,
                        photos: Optional[Sequence[dict]] = None,
                        center: Optional[Tuple[float, float]] = None,
                        buffer_radius_m: float = 250.0,
                        streams: Optional[np.ndarray] = None,
                        boundary_ring: Optional[Sequence[Sequence[float]]] = None) -> str:
    """
    Static location map for the PDF evidence pack: index raster + buffer circle
    + intervention + photo locations, with a north arrow and scale bar.
    """
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    lo, hi = INDEX_RANGES.get(palette, (0, 1))
    fig, ax = _new_fig((7.2, 5.6))
    im = ax.imshow(index_array, cmap=_cmap(palette), vmin=lo, vmax=hi,
                   extent=grid.extent(), aspect="auto", interpolation="nearest")

    if streams is not None and np.any(streams):
        ys, xs = np.nonzero(streams)
        ax.scatter(grid.lon_of(xs), grid.lat_of(ys), s=1.2, c="#0ea5e9",
                   linewidths=0, alpha=0.85, label="Drainage network")

    if boundary_ring:
        xs = [p[0] for p in boundary_ring] + [boundary_ring[0][0]]
        ys = [p[1] for p in boundary_ring] + [boundary_ring[0][1]]
        ax.plot(xs, ys, color="#0f172a", lw=1.6, ls="--", label="Micro-watershed boundary")

    if interventions:
        for item in interventions:
            ax.scatter([item["longitude"]], [item["latitude"]], marker="^", s=70,
                       c="#b45309", edgecolors="white", linewidths=0.8, zorder=5,
                       label="Interventions" if item is interventions[0] else None)

    if photos:
        for item in photos:
            if item.get("latitude") is None:
                continue
            ax.scatter([item["longitude"]], [item["latitude"]], marker="o", s=45,
                       c="#e11d48", edgecolors="white", linewidths=0.7, zorder=6,
                       label="Geo-coded photo" if item is photos[0] else None)

    if center:
        lat, lon = center
        theta = np.linspace(0, 2 * np.pi, 180)
        import math
        from .geo_utils import metres_per_degree
        m_lng, m_lat = metres_per_degree(lat)
        ax.plot(lon + (buffer_radius_m / m_lng) * np.cos(theta),
                lat + (buffer_radius_m / m_lat) * np.sin(theta),
                color="#16a34a", lw=2.0, ls="--", label=f"{int(buffer_radius_m)} m buffer")
        ax.scatter([lon], [lat], marker="*", s=180, c="#16a34a",
                   edgecolors="white", linewidths=0.8, zorder=7)

    ax.set_xlim(grid.min_lon, grid.max_lon)
    ax.set_ylim(grid.min_lat, grid.max_lat)
    ax.set_xlabel("Longitude (°E)", fontsize=8)
    ax.set_ylabel("Latitude (°N)", fontsize=8)
    ax.tick_params(labelsize=7)
    ax.set_title(title or "Location map", fontsize=10, fontweight="bold", pad=8)
    ax.legend(loc="upper left", fontsize=6, framealpha=0.85, facecolor="white")
    ax.annotate("N", xy=(0.965, 0.06), xytext=(0.965, 0.17), xycoords="axes fraction",
                ha="center", fontsize=9, fontweight="bold",
                arrowprops=dict(arrowstyle="->", lw=1.2))
    cbar = fig.colorbar(im, ax=ax, fraction=0.035, pad=0.02)
    cbar.ax.tick_params(labelsize=7)
    fig.tight_layout()
    fig.savefig(out_path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return out_path


def figure_timeseries(series: Sequence[dict], out_path: str, title: str = "",
                      metrics: Sequence[str] = ("ndvi", "ndwi")) -> str:
    """Multi-epoch NDVI / NDWI profile - the seasonal response curve."""
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    fig, ax = _new_fig((7.2, 3.1))
    dates = [s["date"] for s in series]
    colors = {"ndvi": "#16a34a", "ndwi": "#0284c7"}
    labels = {"ndvi": "NDVI (vegetation)", "ndwi": "NDWI (surface water)"}
    for metric in metrics:
        ax.plot(dates, [s.get(metric, 0) for s in series], marker="o", lw=1.8, ms=4,
                color=colors.get(metric, "#334155"), label=labels.get(metric, metric))
    ax.axhline(0, color="#94a3b8", lw=0.8, ls=":")
    ax.set_ylabel("Index value", fontsize=8)
    ax.tick_params(axis="x", rotation=35, labelsize=7)
    ax.tick_params(axis="y", labelsize=7)
    ax.grid(alpha=0.25, lw=0.6)
    ax.legend(fontsize=7, framealpha=0.9)
    ax.set_title(title or "Multi-temporal index profile", fontsize=10, fontweight="bold")
    fig.tight_layout()
    fig.savefig(out_path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return out_path


def figure_lulc_bars(rows: Sequence[dict], out_path: str, title: str = "LULC change") -> str:
    """Grouped bar chart: class area at T0 vs T1."""
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    fig, ax = _new_fig((7.2, 3.2))
    labels = [r["label"].split(" / ")[0] for r in rows]
    before = [r["t0_ha"] for r in rows]
    after = [r["t1_ha"] for r in rows]
    x = np.arange(len(labels))
    ax.bar(x - 0.2, before, width=0.4, label="T0 (baseline)", color="#cbd5e1")
    ax.bar(x + 0.2, after, width=0.4, label="T1 (latest)", color="#16a34a")
    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=18, ha="right", fontsize=7)
    ax.tick_params(axis="y", labelsize=7)
    ax.set_ylabel("Area (ha)", fontsize=8)
    ax.legend(fontsize=7, framealpha=0.9)
    ax.grid(axis="y", alpha=0.25, lw=0.6)
    ax.set_title(title, fontsize=10, fontweight="bold")
    fig.tight_layout()
    fig.savefig(out_path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return out_path


def figure_ranking(rows: Sequence[dict], out_path: str, title: str = "Intervention impact ranking") -> str:
    """Horizontal bar chart of the composite impact score per intervention."""
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    fig, ax = _new_fig((7.2, 0.5 * max(len(rows), 1) + 1.4))
    rows = sorted(rows, key=lambda r: r.get("impact_score", 0))
    names = [r["name"][:38] for r in rows]
    scores = [r.get("impact_score", 0) for r in rows]
    colors = ["#16a34a" if s >= 65 else "#f59e0b" if s >= 40 else "#ef4444" for s in scores]
    ax.barh(names, scores, color=colors)
    for i, s in enumerate(scores):
        ax.text(s + 1, i, f"{s:.0f}", va="center", fontsize=7, color="#334155")
    ax.set_xlim(0, 110)
    ax.set_xlabel("Composite impact score (0-100)", fontsize=8)
    ax.tick_params(labelsize=7)
    ax.grid(axis="x", alpha=0.25, lw=0.6)
    ax.set_title(title, fontsize=10, fontweight="bold")
    fig.tight_layout()
    fig.savefig(out_path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return out_path


def figure_change_histogram(delta: np.ndarray, out_path: str, index_name: str = "NDVI",
                            title: str = "Distribution of pixel change") -> str:
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    fig, ax = _new_fig((7.2, 2.8))
    data = np.asarray(delta, dtype="float64").ravel()
    ax.hist(data, bins=60, color="#0ea5e9", alpha=0.85, edgecolor="white", linewidth=0.3)
    ax.axvline(0, color="#334155", lw=1.0, ls="--")
    ax.axvline(float(np.mean(data)), color="#ef4444", lw=1.2,
               label=f"mean Δ = {np.mean(data):+.3f}")
    ax.set_xlabel(f"Δ{index_name} (T1 - T0)", fontsize=8)
    ax.set_ylabel("Pixels", fontsize=8)
    ax.tick_params(labelsize=7)
    ax.legend(fontsize=7)
    ax.set_title(title, fontsize=10, fontweight="bold")
    fig.tight_layout()
    fig.savefig(out_path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return out_path


def figure_photo_composition(interpretation: dict, out_path: str) -> str:
    """Small stacked bar summarising the automated photo interpretation."""
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    fig, ax = _new_fig((3.4, 1.5))
    comp = interpretation.get("composition_pct", {})
    keys = ["vegetation", "water", "soil_or_earthwork", "structure", "sky", "other"]
    colors = ["#16a34a", "#0284c7", "#a16207", "#57534e", "#bae6fd", "#cbd5e1"]
    left = 0.0
    for key, color in zip(keys, colors):
        value = float(comp.get(key, 0))
        if value <= 0:
            continue
        ax.barh([0], [value], left=left, color=color, height=0.6, label=key.replace("_", " "))
        left += value
    ax.set_xlim(0, 100)
    ax.set_yticks([])
    ax.set_xlabel("% of frame", fontsize=7)
    ax.tick_params(labelsize=6)
    ax.legend(fontsize=5.5, ncol=3, loc="upper center", bbox_to_anchor=(0.5, 1.55), framealpha=0.9)
    fig.tight_layout()
    fig.savefig(out_path, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return out_path


def png_bytes(path: str) -> bytes:
    with open(path, "rb") as fh:
        return fh.read()
