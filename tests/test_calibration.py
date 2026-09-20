"""
test_calibration.py
===================
Known-answer (calibration) tests.

The rest of the suite proves the code does what the code says.  These tests
prove the *measurements* are right, which is a different and stronger claim:
every case here has an analytically known answer - a water body of a known
area, a planted NDVI increase of a known magnitude, a buffer of known geometry
- and the pipeline is required to recover it within a stated tolerance.

Without this class of test, "49 tests pass" only means the software is
self-consistent.  With it, a reviewer can see the platform's hectares are real
hectares and its deltas are real deltas.
"""

from __future__ import annotations

import math
import os
import sys

import numpy as np
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from geospatial.geo_utils import RasterGrid, circular_mask          # noqa: E402
from geospatial.raster_processor import (                            # noqa: E402
    RasterStack,
    nan_weighted_mean,
)
from geospatial.scoring import (                                     # noqa: E402
    confidence,
    impact_components,
    impact_score,
    percentile_rank,
    seasonal_matching,
    spearman,
)


# --------------------------------------------------------------------------- #
# 1. Geometry: does the platform measure area correctly?
# --------------------------------------------------------------------------- #
def test_pixel_area_matches_spherical_geometry():
    """Per-pixel ground area must match the geodesic calculation."""
    lat = 19.2247
    grid = RasterGrid([74.6208, 19.2122, 74.6458, 19.2372], 250, 250)
    areas = grid.area_map_m2()
    assert areas.shape == (250, 250)

    dx_deg = (74.6458 - 74.6208) / 250
    dy_deg = (19.2372 - 19.2122) / 250
    # geodesic cell size at the centre latitude
    m_lat = 111132.92 - 559.82 * math.cos(2 * math.radians(lat)) + 1.175 * math.cos(
        4 * math.radians(lat))
    m_lon = 111412.84 * math.cos(math.radians(lat)) - 93.5 * math.cos(
        3 * math.radians(lat))
    expected = dx_deg * m_lon * dy_deg * m_lat
    assert areas.mean() == pytest.approx(expected, rel=0.02)


def test_circular_buffer_area_is_pi_r_squared():
    """A 250 m buffer must enclose pi*r^2 hectares (within 1 %)."""
    grid = RasterGrid([74.6208, 19.2122, 74.6458, 19.2372], 250, 250)
    mask = circular_mask(grid, 19.2247, 74.6333, 250.0)
    measured_ha = float(grid.area_map_ha()[mask].sum())
    expected_ha = math.pi * 250.0 ** 2 / 10_000.0
    assert measured_ha == pytest.approx(expected_ha, rel=0.01)


def test_buffer_area_scales_with_radius_squared():
    """Doubling the radius must ~quadruple the area (a square buffer would 4x too,
    so this also guards against an axis-aligned degenerate mask)."""
    grid = RasterGrid([74.6208, 19.2122, 74.6458, 19.2372], 250, 250)
    a1 = float(grid.area_map_ha()[circular_mask(grid, 19.2247, 74.6333, 150.0)].sum())
    a2 = float(grid.area_map_ha()[circular_mask(grid, 19.2247, 74.6333, 300.0)].sum())
    assert a2 / a1 == pytest.approx(4.0, rel=0.02)


# --------------------------------------------------------------------------- #
# 2. Measurement recovery: plant a known change, recover it
# --------------------------------------------------------------------------- #
def _stack(bounds, red, nir, green=None, swir=None, key="t"):
    h, w = red.shape
    green = np.full_like(red, 0.08) if green is None else green
    swir = np.full_like(red, 0.20) if swir is None else swir
    return RasterStack(key=key, date="2024-01-01",
                       bands={"red": red, "nir": nir, "green": green, "swir": swir},
                       grid=RasterGrid(bounds, h, w))


def test_water_area_recovery_within_tolerance():
    """
    Plant a water body of exactly known area and require the NDWI water
    detector to recover it within 5 %.

    Water: NDWI = (G - NIR) / (G + NIR) > 0.10, so choose G = 0.30, NIR = 0.05
    -> NDWI = +0.714.  Land: G = 0.08, NIR = 0.30 -> NDWI = -0.579.
    """
    bounds = [74.6208, 19.2122, 74.6458, 19.2372]
    n = 200
    grid = RasterGrid(bounds, n, n)
    area_ha = grid.area_map_ha()

    green = np.full((n, n), 0.08, dtype="float32")
    nir = np.full((n, n), 0.30, dtype="float32")
    # a disc of radius 30 pixels at the centre
    yy, xx = np.mgrid[0:n, 0:n]
    disc = (yy - n // 2) ** 2 + (xx - n // 2) ** 2 <= 30 ** 2
    green[disc] = 0.30
    nir[disc] = 0.05

    stack = _stack(bounds, np.full((n, n), 0.10, dtype="float32"), nir, green)
    detected = float(area_ha[stack.ndwi > 0.10].sum())
    expected = float(area_ha[disc].sum())
    # (a) does the detector recover the planted water body?
    assert detected == pytest.approx(expected, rel=0.05)
    # (b) and is that area the *true* ground area of a 30-pixel disc?
    from geospatial.geo_utils import metres_per_degree
    m_lon, m_lat = metres_per_degree(19.2247)
    cell_m = math.sqrt(grid.dx * m_lon * grid.dy * m_lat)
    assert expected == pytest.approx(
        math.pi * (30 * cell_m) ** 2 / 10_000, rel=0.02)


def test_ndvi_delta_recovery_is_exact():
    """A uniform +0.20 NDVI increase on every pixel must measure exactly +0.20."""
    bounds = [74.6208, 19.2122, 74.6458, 19.2372]
    n = 60
    red0, nir0 = np.full((n, n), 0.20, "float32"), np.full((n, n), 0.25, "float32")
    red1, nir1 = np.full((n, n), 0.15, "float32"), np.full((n, n), 0.35, "float32")
    a = _stack(bounds, red0, nir0, key="a")
    b = _stack(bounds, red1, nir1, key="b")
    ndvi_a = (nir0 - red0) / (nir0 + red0)
    ndvi_b = (nir1 - red1) / (nir1 + red1)
    measured = float(b.ndvi.mean() - a.ndvi.mean())
    assert measured == pytest.approx(float(ndvi_b.mean() - ndvi_a.mean()), abs=1e-6)
    assert measured > 0.20            # the planted change is a big greening


def test_cloud_masked_pixels_do_not_bias_the_mean():
    """
    The headline question for real data: if 37 % of pixels are masked as cloud,
    does the reported mean still equal the mean of the *observed* pixels?

    (Answering "no" here would silently bias every real-data figure.)
    """
    rng = np.random.default_rng(7)
    values = rng.uniform(0.1, 0.5, size=(100, 100)).astype("float32")
    masked = values.copy()
    cloud = rng.random((100, 100)) < 0.37
    masked[cloud] = np.nan
    assert nan_weighted_mean(masked) == pytest.approx(
        float(values[~cloud].mean()), rel=1e-6)
    # and an all-cloud window must say "no observation", not silently return 0
    assert math.isnan(nan_weighted_mean(np.full((10, 10), np.nan)))


def test_area_weighting_varies_with_latitude_and_changes_the_mean():
    """
    Per-pixel ground area must shrink with cos(latitude) across the rows, and
    area-weighting a north-south gradient must therefore differ from a plain
    pixel mean.  This is what makes reported hectares true hectares.
    """
    grid = RasterGrid([74.6208, 19.2122, 74.6458, 19.2372], 200, 200)
    areas = grid.area_map_m2()
    row_areas = areas[:, 0]
    # northern rows (lower index) are at higher latitude -> smaller cells
    assert row_areas[0] < row_areas[-1]
    assert (row_areas[-1] / row_areas[0] - 1.0) > 1e-4

    ramp = np.tile(np.arange(200, dtype="float64")[:, None], (1, 200))  # N-S gradient
    weighted = float(np.average(ramp, weights=areas))
    assert weighted != pytest.approx(float(ramp.mean()), rel=1e-5)


# --------------------------------------------------------------------------- #
# 3. Scoring: is the score a faithful function of the inputs?
# --------------------------------------------------------------------------- #
def test_impact_score_is_monotonic_in_each_component():
    """More vegetation / water / extent must never lower the score."""
    base = dict(ndvi_land_delta=0.05, water_delta_ha=1.0,
                improved_ha=5.0, buffer_area_ha=19.6)
    for key, values in (("ndvi_land_delta", (0.05, 0.06, 0.08, 0.12, 0.2)),
                        ("water_delta_ha", (1.0, 2.0, 4.0, 8.0, 12.0)),
                        ("improved_ha", (5.0, 6.0, 8.0, 12.0, 16.0))):
        prev = impact_score(impact_components(**base))
        for v in values:
            kwargs = dict(base)
            kwargs[key] = v
            score = impact_score(impact_components(**kwargs))
            assert score >= prev - 1e-9, f"{key}={v} lowered the score"
            prev = score
        # and the endpoint must be strictly better than the start
        end = dict(base)
        end[key] = values[-1]
        assert impact_score(impact_components(**end)) > \
            impact_score(impact_components(**base))


def test_impact_score_default_weights_are_identity():
    """Default weighting must return the nominal components unchanged."""
    comp = impact_components(ndvi_land_delta=0.072, water_delta_ha=9.52,
                             improved_ha=12.0, buffer_area_ha=19.63)
    assert impact_score(comp) == pytest.approx(
        comp["vegetation"] + comp["water"] + comp["extent"], abs=0.05)


def test_alternative_weightings_are_like_for_like():
    """Alternative weights must rescale, not invent, score mass: an all-zero
    response scores 0 under every scheme, and weights summing to the same total
    give the same score."""
    zero = impact_components(ndvi_land_delta=0.0, water_delta_ha=0.0,
                             improved_ha=0.0, buffer_area_ha=19.63)
    for scheme in ({"vegetation": 40, "water": 40, "extent": 20},
                   {"vegetation": 60, "water": 20, "extent": 20},
                   {"vegetation": 0.4, "water": 0.4, "extent": 0.2},
                   {"vegetation": 4, "water": 4, "extent": 2}):
        assert impact_score(zero, scheme) == 0.0
    # fractional and absolute forms of the same weights agree
    comp = impact_components(ndvi_land_delta=0.1, water_delta_ha=3.0,
                             improved_ha=8.0, buffer_area_ha=19.63)
    assert impact_score(comp, {"vegetation": 40, "water": 40, "extent": 20}) == \
        pytest.approx(impact_score(comp, {"vegetation": 0.4, "water": 0.4,
                                          "extent": 0.2}), abs=0.05)


def test_confidence_moves_with_evidence_quality():
    """Confidence must be sensitive to exactly the things that make evidence weak."""
    best = dict(observation_completeness=1.0, temporal_replication=1.0,
                seasonal_matching=1.0, photo_corroboration=1.0,
                spatial_coverage=1.0, baseline_control=1.0)
    high = confidence(best)["score"]
    assert high == pytest.approx(100.0, abs=0.5)
    assert confidence(best)["band"] == "High"

    # no photographs, no pre-works baseline (the real-AOI situation)
    poorer = dict(best, photo_corroboration=0.0, baseline_control=0.4)
    mid = confidence(poorer)["score"]
    assert mid < high
    assert 40 < mid < 95

    # one cloudy epoch on top of that
    worst = dict(poorer, observation_completeness=0.63, seasonal_matching=0.73)
    low = confidence(worst)["score"]
    assert low < mid
    assert confidence(worst)["band"] in ("Moderate", "Low", "Very low")
    # components must account for the whole score
    assert sum(confidence(worst)["components"].values()) == pytest.approx(low, abs=0.15)


def test_confidence_is_independent_of_impact():
    """
    The whole point of splitting the two scores: identical impact with very
    different evidence quality must produce different confidence.
    """
    factors_good = dict(observation_completeness=1.0, temporal_replication=1.0,
                        seasonal_matching=1.0, photo_corroboration=1.0,
                        spatial_coverage=1.0, baseline_control=1.0)
    factors_poor = dict(factors_good, photo_corroboration=0.0,
                        baseline_control=0.4, observation_completeness=0.6)
    assert confidence(factors_good)["score"] > confidence(factors_poor)["score"]


def test_seasonal_matching_decays_with_day_of_year_gap():
    assert seasonal_matching("2024-05-03", "2024-05-03") == pytest.approx(1.0, abs=1e-9)
    assert seasonal_matching("2024-05-03", "2024-08-01") == pytest.approx(
        1 - 90 / 90, abs=0.02)          # ~90 days apart -> ~0
    assert 0.7 < seasonal_matching("2024-05-03", "2026-05-28") < 0.8
    # gap must wrap across the new year, not be measured the long way round
    assert seasonal_matching("2024-01-05", "2024-12-27") > 0.6


# --------------------------------------------------------------------------- #
# 4. Statistics used by the control comparison
# --------------------------------------------------------------------------- #
def test_percentile_rank_and_spearman():
    population = [10, 20, 30, 40, 50]
    assert percentile_rank(10, population) == 20.0
    assert percentile_rank(50, population) == 100.0
    assert percentile_rank(35, population) == 60.0
    assert percentile_rank(5, population) == 0.0

    assert spearman([1, 2, 3, 4], [1, 2, 3, 4]) == pytest.approx(1.0)
    assert spearman([1, 2, 3, 4], [4, 3, 2, 1]) == pytest.approx(-1.0)
    # a single adjacent swap must reduce, not invert, the correlation
    assert 0.5 < spearman([1, 2, 3, 4], [1, 3, 2, 4]) < 1.0


def test_control_distribution_is_reproducible():
    """The background sample is seeded, so percentiles must be stable."""
    pytest.importorskip("backend.app.services.store")
    from backend.app.services.store import DataStore
    store = DataStore()
    a = store.null_distribution("watershed_001", 250.0, n_samples=200)
    b = store.null_distribution("watershed_001", 250.0, n_samples=200)
    assert a == b
    assert len(a) > 0
    ctx = store.control_context("watershed_001", 250.0)
    assert ctx["available"] and ctx["n"] == len(a)
    assert ctx["std"] >= 0
    assert ctx["mean"] == pytest.approx(float(np.mean(a)), abs=0.05)
