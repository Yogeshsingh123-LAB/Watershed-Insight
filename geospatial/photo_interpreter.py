"""
photo_interpreter.py
====================
Content interpretation of geo-coded field photographs (Module 2 of PS26015).

The problem statement asks for "advanced spatial interpretation techniques"
that convert geo-coded imagery into analytical information about *land use,
vegetation status, water resources and watershed interventions*.  Satellite
imagery covers the synoptic view; the field photographs cover the ground truth.

This module applies classical (non-ML, fully offline, auditable) colour-index
analysis to every photograph:

* **Excess Green Index (ExG = 2G - R - B)** - vegetation / canopy fraction.
* **Excess Red Index (ExR)** and **VARI** - robust greenness under variable
  illumination.
* **Blue-dominance index** - water surface and sky separation, using the
  vertical position of the pixel to distinguish an impounded pond from sky.
* **Bare-soil / earthwork detection** - red-dominant, low-saturation pixels
  typical of bunds, trenches and excavation.
* **Sharpness (variance of Laplacian)** and exposure statistics - is the photo
  actually usable as evidence?

Every photograph is therefore reduced to a vector of *physical* observations
that can be cross-checked against the satellite indicators inside the same
buffer: e.g. "field photo says 42 % canopy, NDVI says +0.21" -> consistent.
"""

from __future__ import annotations

import os
from typing import Dict, List, Tuple

import numpy as np
from PIL import Image, ImageOps

# Analysis resolution - keeps processing under ~30 ms per photo.
WORK_SIZE = (256, 256)

INTERPRETATION_RULES = [
    # (label, minimum vegetation fraction, minimum water fraction)
    ("water_impoundment", 0.00, 0.18),
    ("vegetation_dominant", 0.45, 0.00),
    ("mixed_vegetation_and_soil", 0.20, 0.00),
    ("earthwork_or_bare_ground", 0.00, 0.00),
]


def _load_rgb(path: str) -> np.ndarray:
    with Image.open(path) as img:
        img = ImageOps.exif_transpose(img)
        if img.mode != "RGB":
            img = img.convert("RGB")
        img = img.resize(WORK_SIZE, Image.LANCZOS)
        return np.asarray(img, dtype="float32") / 255.0


def _laplacian_variance(gray: np.ndarray) -> float:
    """Blur detector: variance of the 3x3 Laplacian responds to focus."""
    k = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype="float32")
    h, w = gray.shape
    padded = np.pad(gray, 1, mode="edge")
    out = (
        padded[0:h, 1:w + 1] + padded[1:h + 1, 0:w] +
        padded[1:h + 1, 2:w + 2] + padded[2:h + 2, 1:w + 1] -
        4.0 * padded[1:h + 1, 1:w + 1]
    )
    return float(out.var())


def dominant_colors(rgb: np.ndarray, k: int = 4) -> List[dict]:
    """
    Coarse palette extraction by quantising to a 4x4x4 colour cube - a
    deterministic, dependency-free alternative to k-means.
    """
    q = (rgb * 3.999).astype("int32")
    flat = q.reshape(-1, 3)
    keys, counts = np.unique(flat, axis=0, return_counts=True)
    order = np.argsort(-counts)[:k]
    total = flat.shape[0]
    return [
        {
            "hex": "#{:02x}{:02x}{:02x}".format(
                int((keys[i][0] + 0.5) * 255 / 4),
                int((keys[i][1] + 0.5) * 255 / 4),
                int((keys[i][2] + 0.5) * 255 / 4),
            ),
            "share_pct": round(float(counts[i]) / total * 100, 1),
        }
        for i in order
    ]


def interpret_photo(path: str) -> Dict:
    """
    Full content analysis of one field photograph.

    Returns percentages of vegetation / water / sky / soil / engineered surface,
    image-quality metrics, a dominant-colour palette and a plain-language label.
    """
    if not os.path.exists(path):
        return {"available": False, "error": "photo not found"}

    try:
        rgb = _load_rgb(path)
    except Exception as exc:  # pragma: no cover - corrupt image
        return {"available": False, "error": str(exc)}

    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    total = np.float32(2.0 * 255.0)
    exg = np.clip(2.0 * g - r - b + 1.0, 0, 2) / 2.0            # excess green, 0..1
    exr = np.clip(1.4 * r - g + 1.0, 0, 2) / 2.0                # excess red / soil
    gray = 0.299 * r + 0.587 * g + 0.114 * b
    brightness = float(gray.mean()) * 100.0
    saturation = float((rgb.max(axis=2) - rgb.min(axis=2)).mean()) * 100.0

    # --- vegetation ------------------------------------------------------- #
    veg_mask = (exg > 0.52) & (g > r * 1.02) & (g > b * 1.02) & (gray > 0.06)
    veg_fraction = float(veg_mask.mean())

    # --- water / sky ------------------------------------------------------ #
    blue_dom = (b > r * 1.08) & (b > g * 1.02)
    low_sat_bright = ((rgb.max(axis=2) - rgb.min(axis=2)) < 0.22) & (gray > 0.55)
    sky_zone = np.zeros_like(gray, dtype=bool)
    sky_zone[: int(gray.shape[0] * 0.35), :] = True
    sky_fraction = float((blue_dom & sky_zone).mean()) + float((low_sat_bright & sky_zone).mean()) * 0.5
    water_mask = blue_dom & ~sky_zone & (gray > 0.08)
    water_fraction = float(water_mask.mean())
    sky_fraction = float(min(max(sky_fraction, 0.0), 1.0))

    # --- soil / earthwork ------------------------------------------------- #
    soil_mask = (exr > 0.52) & (r >= g) & (g >= b) & ~veg_mask & ~water_mask
    soil_fraction = float(soil_mask.mean())

    # --- engineered structure (grey/ concrete / masonry) ------------------ #
    engineered_mask = (low_sat_bright | ((np.abs(r - g) < 0.05) & (np.abs(g - b) < 0.05) &
                                         (gray > 0.25) & (gray < 0.75))) & ~veg_mask & ~sky_zone
    engineered_fraction = float(np.clip(engineered_mask.mean(), 0.0, 1.0))

    other_fraction = float(np.clip(
        1.0 - veg_fraction - water_fraction - sky_fraction - soil_fraction - engineered_fraction,
        0.0, 1.0))

    sharpness = _laplacian_variance(gray)
    contrast = float(gray.std()) * 100.0

    # --- composite greenness score (comparable with NDVI in spirit) ------- #
    greenness = float(np.clip((g - r) / (g + r + 1e-6), -1, 1).mean())
    vari = float(np.clip((g - r) / (g + r - b + 1e-6), -1, 1).mean())

    # --- quality flags ---------------------------------------------------- #
    flags: List[str] = []
    if sharpness < 0.0006:
        flags.append("BLURRED")
    if brightness < 22:
        flags.append("UNDEREXPOSED")
    if brightness > 78:
        flags.append("OVEREXPOSED")
    if saturation < 8:
        flags.append("LOW_COLOUR_INFORMATION")

    usable = "BLURRED" not in flags and "UNDEREXPOSED" not in flags and "OVEREXPOSED" not in flags
    confidence = "High" if (usable and sharpness > 0.002) else ("Moderate" if usable else "Low")

    label = "earthwork_or_bare_ground"
    if water_fraction >= 0.15 and water_fraction >= veg_fraction:
        label = "water_impoundment"
    elif veg_fraction >= 0.45:
        label = "vegetation_dominant"
    elif veg_fraction >= 0.20:
        label = "mixed_vegetation_and_soil"
    elif engineered_fraction >= 0.25:
        label = "structure_or_masonry_work"

    label_text = {
        "water_impoundment": "Water impoundment / storage visible",
        "vegetation_dominant": "Vegetation / canopy dominant",
        "mixed_vegetation_and_soil": "Mixed vegetation and open ground",
        "earthwork_or_bare_ground": "Earthwork / bare ground dominant",
        "structure_or_masonry_work": "Engineered structure / masonry visible",
    }.get(label, label)

    return {
        "available": True,
        "photo_id": os.path.splitext(os.path.basename(path))[0],
        "composition_pct": {
            "vegetation": round(veg_fraction * 100, 1),
            "water": round(water_fraction * 100, 1),
            "sky": round(sky_fraction * 100, 1),
            "soil_or_earthwork": round(soil_fraction * 100, 1),
            "structure": round(engineered_fraction * 100, 1),
            "other": round(other_fraction * 100, 1),
        },
        "greenness_index": round(greenness, 3),
        "vari": round(vari, 3),
        "brightness": round(brightness, 1),
        "saturation": round(saturation, 1),
        "contrast": round(contrast, 1),
        "sharpness": round(sharpness, 5),
        "dominant_colors": dominant_colors(rgb),
        "label": label,
        "label_text": label_text,
        "quality_flags": flags,
        "usable_as_evidence": usable,
        "confidence": confidence,
    }


def cross_check_with_satellite(interpretation: Dict, analysis: Dict) -> Dict:
    """
    Cross-validate a field photograph against the satellite buffer analysis.

    A photo showing water while NDWI says "no water" (or vice-versa) is a
    genuine flag for a field officer - the disagreement is the insight.
    """
    if not interpretation.get("available") or not analysis:
        return {"status": "not_available"}

    comp = interpretation["composition_pct"]
    sat_water_gain = float(analysis.get("water_area_change_ha") or 0.0)
    ndvi_delta = float(analysis.get("ndvi_change") or 0.0)
    photo_water = comp["water"] / 100.0
    photo_veg = comp["vegetation"] / 100.0

    agreements: List[str] = []
    conflicts: List[str] = []

    if photo_water >= 0.15 and sat_water_gain > 0.05:
        agreements.append("Field photo shows impounded water and satellite water extent increased.")
    elif photo_water >= 0.15 and sat_water_gain <= 0.0:
        conflicts.append("Field photo shows water but satellite water extent did not increase - "
                         "possible seasonal / ephemeral storage.")
    elif photo_water < 0.05 and sat_water_gain > 0.5:
        conflicts.append("Satellite indicates new surface water but the photo shows none - "
                         "check photo date and view direction.")

    if photo_veg >= 0.35 and ndvi_delta > 0.03:
        agreements.append("Canopy visible in photo is consistent with rising NDVI in the buffer.")
    elif photo_veg >= 0.35 and ndvi_delta <= 0.0:
        conflicts.append("Vegetation visible in photo while buffer NDVI is flat - "
                         "greening may be localised to the photographed spot.")
    elif photo_veg < 0.10 and ndvi_delta > 0.10:
        conflicts.append("Buffer NDVI improved while the photo shows little vegetation - "
                         "verify the photo location.")

    if not agreements and not conflicts:
        status = "inconclusive"
    elif conflicts and not agreements:
        status = "conflict"
    elif conflicts:
        status = "partial_agreement"
    else:
        status = "agreement"

    return {
        "status": status,
        "agreements": agreements,
        "conflicts": conflicts,
        "summary": (
            "Field and satellite observations agree."
            if status == "agreement" else
            "Field and satellite observations partially disagree - verify on ground."
            if status in ("conflict", "partial_agreement") else
            "Not enough signal to cross-validate."
        ),
    }
