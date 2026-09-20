"""
scoring.py
==========
Transparent, auditable scoring for Watershed Insight (SIH PS26015).

Two *different* questions are answered here, and keeping them apart is the
whole point of this module:

``impact_score``
    **How much** change was measured around a structure?  (0-100)

``confidence``
    **How much can we trust** that number?  (0-100)

A structure can score 78 impact with 42 confidence (big change, one cloudy
epoch, no photographs) or 30 impact with 95 confidence (small but very well
observed change).  Collapsing the two into a single "confidence: High" label -
which is what a naive dashboard does - hides exactly the information a
decision-maker needs.

Everything here is arithmetic on measurable quantities.  No component is
invented, and every weight is a named constant that can be changed in one
place.  ``scripts/sensitivity.py`` re-runs the ranking under alternative
weightings so the choice of weights can be defended rather than asserted.
"""

from __future__ import annotations

import math
from typing import Dict, List, Optional, Sequence, Tuple

# --------------------------------------------------------------------------- #
# 1. IMPACT - how much change was measured
# --------------------------------------------------------------------------- #
# Nominal weights.  Vegetation and water response are the two things a watershed
# structure is built to change, so they carry equal weight; spatial extent is a
# corroborating signal (how much of the buffer moved, not just the mean).
IMPACT_WEIGHTS: Dict[str, float] = {
    "vegetation": 40.0,
    "water": 40.0,
    "extent": 20.0,
}

# Each axis is first expressed in *nominal points* (its value at the default
# 40/40/20 weighting) and then rescaled by the weight actually in force.  The
# clip ranges are therefore the default point budgets: vegetation 40, water 40,
# extent 20 - summing to a 0-100 score.
IMPACT_CLIP: Dict[str, Tuple[float, float]] = {
    "vegetation": (-20.0, 40.0),
    "water": (-20.0, 40.0),
    "extent": (-10.0, 20.0),
}

# Response -> sub-score gains (units of score per unit of physical change).
NDVI_GAIN = 170.0        # score points per unit land-only dNDVI
WATER_GAIN = 1.5         # score points per % of buffer newly under water
EXTENT_GAIN = 45.0       # score points per fraction of buffer improved


def impact_components(*, ndvi_land_delta: float, water_delta_ha: float,
                      improved_ha: float, buffer_area_ha: float) -> Dict[str, float]:
    """
    Sub-score for each axis, clipped to its nominal point budget.

    These are the *default-weight* point values: vegetation and water are worth
    up to 40 points each and spatial extent up to 20, so a maximal response
    scores 100.  ``impact_score`` then rescales them if a different weighting
    is in force, which keeps alternative weightings directly comparable.
    """
    water_gain_pct = (water_delta_ha / buffer_area_ha * 100.0) if buffer_area_ha else 0.0
    extent_fraction = (improved_ha / buffer_area_ha) if buffer_area_ha else 0.0
    raw = {
        "vegetation": float(ndvi_land_delta * NDVI_GAIN),
        "water": float(water_gain_pct * WATER_GAIN),
        "extent": float(extent_fraction * EXTENT_GAIN),
    }
    return {k: float(max(IMPACT_CLIP[k][0], min(IMPACT_CLIP[k][1], v)))
            for k, v in raw.items()}


def impact_score(components: Dict[str, float],
                 weights: Optional[Dict[str, float]] = None) -> float:
    """
    Weighted composite impact score, clipped to 0-100.

    ``components`` are the nominal-point sub-scores from
    :func:`impact_components`.  Each is multiplied by the ratio of the weight in
    force to the default weight, so the default 40/40/20 weighting returns the
    components unchanged and any alternative weighting is a like-for-like
    rescaling - which is what makes the sensitivity analysis in
    ``scripts/sensitivity.py`` meaningful.
    """
    w = normalise_weights(weights)
    total = 0.0
    for key, points in components.items():
        total += points * (w[key] / IMPACT_WEIGHTS[key])
    return float(max(0.0, min(100.0, round(total, 1))))


def normalise_weights(weights: Optional[Dict[str, float]] = None) -> Dict[str, float]:
    """Normalise a weight dict onto the 0-40 / 0-40 / 0-20 point scale."""
    base = dict(IMPACT_WEIGHTS)
    if weights:
        base.update({k: float(v) for k, v in weights.items() if k in base})
    total = sum(base.values())
    if total <= 0:
        return {k: 0.0 for k in base}
    scale = sum(IMPACT_WEIGHTS.values()) / total
    return {k: v * scale for k, v in base.items()}


def impact_points(components: Dict[str, float],
                  weights: Optional[Dict[str, float]] = None) -> Dict[str, float]:
    """Weighted contribution of each axis (for UI bars and PDF tables)."""
    w = normalise_weights(weights)
    return {key: round(points * (w[key] / IMPACT_WEIGHTS[key]), 2)
            for key, points in components.items()}


# --------------------------------------------------------------------------- #
# 2. CONFIDENCE - how much the impact score can be trusted
# --------------------------------------------------------------------------- #
# Each factor is a 0-1 score computed from something we can actually measure.
CONFIDENCE_WEIGHTS: Dict[str, float] = {
    "observation_completeness": 0.25,   # cloud-free coverage of the worse epoch
    "temporal_replication": 0.20,       # how many usable epochs back the claim
    "seasonal_matching": 0.15,          # were T0 and T1 the same season?
    "photo_corroboration": 0.20,        # independent geo-tagged field evidence
    "spatial_coverage": 0.10,           # is the buffer fully inside the data?
    "baseline_control": 0.10,           # is there a pre-works observation?
}

EPOCHS_FOR_FULL_REPLICATION = 4     # 4 usable epochs -> full marks
PHOTOS_FOR_FULL_CORROBORATION = 3   # 3 verified photos -> full marks
SEASON_MISMATCH_DAYS = 90           # 90 days of doy separation -> zero credit

CONFIDENCE_BANDS: Sequence[Tuple[float, str]] = (
    (75.0, "High"),
    (55.0, "Moderate"),
    (35.0, "Low"),
    (0.0, "Very low"),
)


def _day_of_year(iso_date: str) -> Optional[int]:
    """Day-of-year for an ISO date, or None if unparseable."""
    try:
        parts = [int(p) for p in str(iso_date)[:10].split("-")]
        if len(parts) < 3:
            return None
        year, month, day = parts[0], parts[1], parts[2]
        cum = (0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334)
        doy = cum[max(0, min(11, month - 1))] + day
        leap = (year % 4 == 0 and year % 100 != 0) or year % 400 == 0
        if leap and month > 2:
            doy += 1
        return doy
    except (ValueError, TypeError):
        return None


def seasonal_matching(date_a: str, date_b: str) -> float:
    """
    1.0 when both epochs fall on the same day-of-year, decaying linearly to 0
    at 90 days of separation (and wrapping across the year boundary).

    A pre-monsoon vs post-monsoon comparison measures the monsoon as much as it
    measures the structure, so this factor exists to penalise exactly that.
    """
    doy_a, doy_b = _day_of_year(date_a), _day_of_year(date_b)
    if doy_a is None or doy_b is None:
        return 0.5                      # unknown - neither credit nor blame
    gap = abs(doy_a - doy_b)
    gap = min(gap, 365 - gap)           # wrap across new year
    return float(max(0.0, 1.0 - gap / SEASON_MISMATCH_DAYS))


def confidence(factors: Dict[str, float],
               weights: Optional[Dict[str, float]] = None) -> Dict[str, object]:
    """
    Combine measurable evidence-quality factors into a 0-100 confidence score.

    Inputs (all 0-1):

    ============================  ============================================
    ``observation_completeness``  min over the two epochs of the cloud-free
                                  pixel fraction inside the buffer
    ``temporal_replication``      usable epochs / 4 (capped)
    ``seasonal_matching``         1 - (day-of-year gap / 90)
    ``photo_corroboration``       verified photos within the buffer / 3 (capped)
    ``spatial_coverage``          buffer pixels with data / buffer pixels
    ``baseline_control``          1.0 with a pre-works baseline, else 0.4
    ============================  ============================================
    """
    w = dict(CONFIDENCE_WEIGHTS)
    if weights:
        w.update({k: float(v) for k, v in weights.items() if k in CONFIDENCE_WEIGHTS})
    total_w = sum(w.values()) or 1.0

    parts: Dict[str, float] = {}
    for key, weight in w.items():
        value = float(max(0.0, min(1.0, factors.get(key, 0.0))))
        parts[key] = round(weight / total_w * value * 100.0, 2)
    score = float(max(0.0, min(100.0, round(sum(parts.values()), 1))))

    band = CONFIDENCE_BANDS[-1][1]
    for threshold, label in CONFIDENCE_BANDS:
        if score >= threshold:
            band = label
            break
    return {
        "score": score,
        "band": band,
        "components": parts,
        "factors": {k: round(float(max(0.0, min(1.0, v))), 4)
                    for k, v in factors.items()},
        "weights": {k: round(v / total_w, 4) for k, v in w.items()},
    }


def confidence_formula() -> str:
    """One-line statement of how confidence is computed (printed in reports)."""
    return (
        "Confidence = 100 x ("
        + " + ".join(f"{w:.2f}·{k}" for k, w in CONFIDENCE_WEIGHTS.items())
        + f"), with temporal_replication = min(1, epochs/{EPOCHS_FOR_FULL_REPLICATION}), "
        + f"photo_corroboration = min(1, verified_photos/{PHOTOS_FOR_FULL_CORROBORATION}), "
        + f"seasonal_matching = 1 - (day-of-year gap / {SEASON_MISMATCH_DAYS})."
    )


def impact_formula(weights: Optional[Dict[str, float]] = None) -> str:
    w = normalise_weights(weights)
    return (
        "Impact = clip(170 x land-only dNDVI, -20, 40) x {v:.2f}"
        " + clip(1.5 x % of buffer newly under water, -20, 40) x {w:.2f}"
        " + clip(45 x fraction of buffer improved, -10, 20) x {e:.2f}"
    ).format(v=w["vegetation"] / IMPACT_WEIGHTS["vegetation"],
             w=w["water"] / IMPACT_WEIGHTS["water"],
             e=w["extent"] / IMPACT_WEIGHTS["extent"])


# --------------------------------------------------------------------------- #
# 3. Statistical context - is a score actually high?
# --------------------------------------------------------------------------- #
def percentile_rank(value: float, population: Sequence[float]) -> float:
    """
    Percentage of ``population`` at or below ``value`` (0-100).

    Used to compare an intervention's score against the *background*:
    a score of 45 sounds mediocre in the abstract, but if random control points
    in the same watershed score 12 +/- 8, it is exceptional.
    """
    if not population:
        return float("nan")
    arr = sorted(float(v) for v in population if v == v)   # drop NaN
    if not arr:
        return float("nan")
    below = sum(1 for v in arr if v <= value)
    return round(below / len(arr) * 100.0, 1)


def spearman(a: Sequence[float], b: Sequence[float]) -> float:
    """Spearman rank correlation - used by the weighting sensitivity analysis."""
    if len(a) != len(b) or len(a) < 2:
        return float("nan")
    ra, rb = _ranks(a), _ranks(b)
    n = len(ra)
    ma, mb = sum(ra) / n, sum(rb) / n
    num = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    den = math.sqrt(sum((x - ma) ** 2 for x in ra) * sum((y - mb) ** 2 for y in rb))
    return round(num / den, 4) if den else float("nan")


def _ranks(values: Sequence[float]) -> List[float]:
    order = sorted(range(len(values)), key=lambda i: values[i])
    ranks = [0.0] * len(values)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        avg = (i + j) / 2.0 + 1.0
        for k in range(i, j + 1):
            ranks[order[k]] = avg
        i = j + 1
    return ranks
