"""
test_geospatial.py - unit tests for the analytical engine.

These tests are the scientific contract of the platform: if a refactor changes
an index, a buffer area or a flow-routing result, these tests fail.
"""

from __future__ import annotations

import math
import os

import numpy as np
import pytest

from geospatial.geo_utils import (
    RasterGrid, buffer_polygon_geojson, circular_mask, describe, haversine_m,
    metres_per_degree, normalise, pct_change, polygon_area_m2, safe_div,
)
from geospatial.hydrology import (
    delineate_catchment, extract_streams, fill_sinks, flow_accumulation,
    flow_direction_d8, slope_aspect, strahler_order, topographic_wetness_index,
)
from geospatial.lulc import classify, stacked_area_table, transition_matrix
from geospatial.raster_processor import RasterProcessor, normalised_difference


# --------------------------------------------------------------------------- #
# geo_utils
# --------------------------------------------------------------------------- #
def test_haversine_known_distance():
    # One degree of latitude at the equator is ~111.2 km.
    d = haversine_m(0, 0, 1, 0)
    assert 110_500 < d < 111_500
    # Mumbai -> Delhi is roughly 1,150 km.
    d2 = haversine_m(19.0760, 72.8777, 28.6139, 77.2090)
    assert 1_100_000 < d2 < 1_200_000


def test_metres_per_degree_shrinks_with_latitude():
    lng_equator, lat0 = metres_per_degree(0)
    lng_60, _ = metres_per_degree(60)
    assert lng_equator > lng_60
    assert abs(lng_60 - lng_equator * 0.5) < 1.0     # cos(60°) = 0.5


def test_raster_grid_roundtrip():
    grid = RasterGrid([75.0, 19.0, 75.1, 19.1], 100, 200)
    lat, lon = grid.lat_of(10), grid.lon_of(20)
    assert abs(grid.row_of(lat) - 10) < 1e-6
    assert abs(grid.col_of(lon) - 20) < 1e-6
    assert grid.leaflet_bounds() == [[19.0, 75.0], [19.1, 75.1]]


def test_pixel_area_is_physical():
    grid = RasterGrid([75.0, 19.0, 75.1, 19.1], 100, 100)
    area_m2 = grid.pixel_area_m2()
    assert area_m2.shape == (100, 1)
    # ~11.1 km x ~11.1 km grid -> ~1.23 km² total
    total_km2 = area_m2.sum() / 1e6
    assert 1.15 < total_km2 < 1.30


def test_circular_mask_area_matches_geometry():
    grid = RasterGrid([75.0, 19.0, 75.1, 19.1], 500, 500)
    mask = circular_mask(grid, 19.05, 75.05, 250)
    area_m2 = float(grid.area_map_m2()[mask].sum())
    expected = math.pi * 250 ** 2
    assert abs(area_m2 - expected) / expected < 0.05      # within 5 % of πr²


def test_polygon_area_and_buffer_ring():
    square = [[0, 0], [0.001, 0], [0.001, 0.001], [0, 0.001], [0, 0]]
    area = polygon_area_m2(square)
    # 0.001° ≈ 111 m per side -> ~12,300 m²
    assert 11_000 < area < 13_500
    ring = buffer_polygon_geojson(19.0, 75.0, 100)
    assert ring["type"] == "Polygon"
    assert ring["coordinates"][0][0] == ring["coordinates"][0][-1]  # closed


def test_pct_change_and_safe_div():
    assert pct_change(10, 15) == 50.0
    assert pct_change(0, 5) is None          # undefined, not "+100 %"
    assert pct_change(0, 0) == 0.0
    assert safe_div(1, 0) == 0.0
    assert describe(np.array([1, 2, 3, 4]))["mean"] == 2.5
    assert np.allclose(normalise(np.array([0, 5, 10]), 0, 10), [0, 0.5, 1.0])


# --------------------------------------------------------------------------- #
# raster processor
# --------------------------------------------------------------------------- #
def test_normalised_difference_math():
    a = np.array([[0.5, 0.2]], dtype="float32")
    b = np.array([[0.1, 0.2]], dtype="float32")
    nd = normalised_difference(a, b)
    assert abs(nd[0, 0] - (0.4 / 0.6)) < 1e-5
    assert nd[0, 1] == 0.0                        # zero denominator guard


def test_processor_indices_and_bounds(tiny_dataset):
    proc = RasterProcessor(tiny_dataset["watershed_id"], data_dir=tiny_dataset["root"])
    assert proc.t0_key == "before" and proc.t1_key == "after"
    ndvi = proc.index("after", "ndvi")
    assert ndvi.shape == (40, 40)
    # Vegetation patch must have a much higher NDVI than bare ground.
    assert ndvi[tiny_dataset["veg_patch"]].mean() > ndvi[~tiny_dataset["veg_patch"]].mean() + 0.2
    ndwi = proc.index("after", "ndwi")
    assert ndwi[tiny_dataset["water_patch"]].mean() > 0.1


def test_buffer_analysis_detects_improvement(tiny_dataset):
    proc = RasterProcessor(tiny_dataset["watershed_id"], data_dir=tiny_dataset["root"])
    grid = tiny_dataset["grid"]
    lat, lon = grid.lat_of(10), grid.lon_of(30)          # centre of the vegetation patch
    res = proc.analyse_buffer(lat, lon, 200)
    assert res["ndvi_change"] > 0.05
    assert res["impact_score"] > 0
    assert res["buffer_area_ha"] > 0
    # Buffer area should be close to π·200² = 12.57 ha
    assert abs(res["buffer_area_ha"] - 12.57) < 1.5


def test_watershed_stats_accounting(tiny_dataset):
    proc = RasterProcessor(tiny_dataset["watershed_id"], data_dir=tiny_dataset["root"])
    stats = proc.watershed_stats()
    assert stats["ndvi_mean_t1"] > stats["ndvi_mean_t0"]
    assert stats["water_area_ha_t1"] > stats["water_area_ha_t0"]
    # 40 x 40 cells over a 0.02 deg x 0.02 deg box (~2.2 km per side) -> ~490 ha
    assert 420 < stats["total_area_ha"] < 520
    # Areas must add up: water + veg + rest cannot exceed the total.
    assert stats["water_area_ha_t1"] + stats["veg_area_ha_t1"] <= stats["total_area_ha"] + 0.01


def test_time_series_and_change_detection(tiny_dataset):
    proc = RasterProcessor(tiny_dataset["watershed_id"], data_dir=tiny_dataset["root"])
    series = proc.time_series()
    assert len(series) == 2
    assert series[0]["date"] == "2024-05-28" and series[1]["date"] == "2026-05-26"
    change = proc.change_detection("ndvi")
    assert change["mean_delta"] > 0
    total_share = sum(c["pct_of_area"] for c in change["change_classes"].values())
    assert abs(total_share - 100.0) < 0.5        # classes partition the area


# --------------------------------------------------------------------------- #
# LULC
# --------------------------------------------------------------------------- #
def test_lulc_classification_rules():
    water = classify(np.array([[0.05]]), np.array([[0.55]]), np.array([[-0.4]]))
    dense = classify(np.array([[0.72]]), np.array([[-0.3]]), np.array([[-0.3]]))
    crop = classify(np.array([[0.38]]), np.array([[-0.3]]), np.array([[-0.3]]))
    scrub = classify(np.array([[0.20]]), np.array([[-0.3]]), np.array([[-0.3]]))
    bare = classify(np.array([[0.08]]), np.array([[-0.3]]), np.array([[-0.2]]))
    built = classify(np.array([[0.08]]), np.array([[-0.3]]), np.array([[0.25]]))
    assert water.classes[0, 0] == 1
    assert dense.classes[0, 0] == 2
    assert crop.classes[0, 0] == 3
    assert scrub.classes[0, 0] == 4
    assert bare.classes[0, 0] == 5
    assert built.classes[0, 0] == 6


def test_lulc_transition_matrix_conserves_area(tiny_dataset):
    proc = RasterProcessor(tiny_dataset["watershed_id"], data_dir=tiny_dataset["root"])
    area = proc.pixel_area_ha
    t0 = classify(proc.index("before", "ndvi"), proc.index("before", "ndwi"),
                  proc.index("before", "ndbi"))
    t1 = classify(proc.index("after", "ndvi"), proc.index("after", "ndwi"),
                  proc.index("after", "ndbi"))
    tr = transition_matrix(t0, t1, area)
    total = float(np.broadcast_to(area, t0.classes.shape).sum())
    assert abs(tr["total_area_ha"] - total) < 0.05
    assert tr["changed_area_ha"] + tr["unchanged_area_ha"] - tr["total_area_ha"] < 0.05
    rows = stacked_area_table(t0, t1, area)
    assert len(rows) == 6
    assert all(abs(r["delta_ha"] - (r["t1_ha"] - r["t0_ha"])) < 1e-6 for r in rows)


# --------------------------------------------------------------------------- #
# Hydrology
# --------------------------------------------------------------------------- #
def test_sink_filling_removes_depressions():
    dem = np.full((20, 20), 100.0, dtype="float32")
    dem[10, 10] = 80.0                       # isolated pit
    filled = fill_sinks(dem)
    assert filled[10, 10] >= 100.0 - 1e-3
    assert filled.min() >= 99.9


def test_d8_flow_routes_downhill_on_a_plane():
    dem = np.tile(np.arange(20, 0, -1, dtype="float32"), (20, 1))   # decreases to the right
    grid = RasterGrid([75.0, 19.0, 75.02, 19.02], 20, 20)
    fdir = flow_direction_d8(dem, grid)
    # Every cell (except the right edge) must point east (code 3).
    assert (fdir[:, :-1] == 3).all()


def test_flow_accumulation_increases_downstream():
    dem = np.tile(np.arange(30, 0, -1, dtype="float32"), (30, 1))
    grid = RasterGrid([75.0, 19.0, 75.03, 19.03], 30, 30)
    fdir = flow_direction_d8(dem, grid)
    acc = flow_accumulation(fdir)
    # Along the flow direction accumulation must be monotonically increasing.
    row = acc[15]
    assert all(row[i] < row[i + 1] for i in range(len(row) - 1))


def test_stream_order_and_catchment(tiny_dataset):
    from geospatial.hydrology import load_dem
    dem, grid = load_dem(tiny_dataset["watershed_id"], data_dir=tiny_dataset["root"])
    filled = fill_sinks(dem)
    fdir = flow_direction_d8(filled, grid)
    acc = flow_accumulation(fdir)
    streams = extract_streams(acc, threshold=15)
    assert streams.any()
    order = strahler_order(streams, fdir)
    assert order.max() >= 1
    assert ((order > 0) == streams).all()          # only stream cells are ordered

    # A pour point low in the catchment must accumulate a large contributing area.
    mask, cell = delineate_catchment(fdir, grid, grid.lat_of(38), grid.lon_of(38))
    assert mask.sum() > 10


def test_slope_and_twi_shapes(tiny_dataset):
    from geospatial.hydrology import load_dem
    dem, grid = load_dem(tiny_dataset["watershed_id"], data_dir=tiny_dataset["root"])
    slope, aspect = slope_aspect(dem, grid)
    assert slope.shape == dem.shape and aspect.shape == dem.shape
    assert (slope >= 0).all()
    assert (aspect >= 0).all() and (aspect <= 360).all()
    twi = topographic_wetness_index(np.full(dem.shape, 500.0), slope, grid)
    assert twi.shape == dem.shape


# --------------------------------------------------------------------------- #
# EXIF & photo interpretation
# --------------------------------------------------------------------------- #
def test_dms_conversion_and_binding(tmp_path):
    from geospatial.exif_engine import (
        PhotoMetadata, bind_to_interventions, dms_to_decimal, extract_metadata,
        make_thumbnail, write_gps_exif,
    )
    assert abs(dms_to_decimal([(19, 1), (30, 1), (0, 100)], "N") - 19.5) < 1e-6
    assert abs(dms_to_decimal([(75, 1), (45, 1), (0, 100)], "E") - 75.75) < 1e-6

    interventions = [
        {"id": "INT-1", "latitude": 19.8445, "longitude": 75.3430, "installation_date": "2025-01-01"},
        {"id": "INT-2", "latitude": 19.9000, "longitude": 75.4000, "installation_date": "2025-01-01"},
    ]
    photo = PhotoMetadata(photo_id="P1", file_name="P1.jpg",
                          latitude=19.8446, longitude=75.3431, has_gps=True,
                          timestamp="2025-06-01T10:00:00")
    bind_to_interventions(photo, interventions, buffer_radius_m=250)
    assert photo.intervention_id == "INT-1"
    assert photo.within_buffer is True
    assert photo.distance_to_intervention_m < 50
    assert photo.quality == "verified"

    far = PhotoMetadata(photo_id="P2", file_name="P2.jpg",
                        latitude=19.95, longitude=75.50, has_gps=True,
                        timestamp="2025-06-01T10:00:00")
    bind_to_interventions(far, interventions, buffer_radius_m=250)
    assert "OUTSIDE_BUFFER" in far.validation or "NO_INTERVENTION_WITHIN_RANGE" in far.validation

    before = PhotoMetadata(photo_id="P3", file_name="P3.jpg",
                           latitude=19.8445, longitude=75.3430, has_gps=True,
                           timestamp="2024-06-01T10:00:00")
    bind_to_interventions(before, interventions, buffer_radius_m=250)
    assert "CAPTURED_BEFORE_INSTALLATION" in before.validation


def test_exif_write_read_roundtrip(tmp_path):
    from geospatial.exif_engine import extract_metadata, write_gps_exif
    from PIL import Image

    src = tmp_path / "src.jpg"
    dst = tmp_path / "dst.jpg"
    Image.new("RGB", (64, 48), (120, 130, 90)).save(src, "jpeg")
    write_gps_exif(str(src), str(dst), 19.8445, 75.3430)
    meta = extract_metadata(str(dst), "roundtrip")
    assert meta.has_gps
    assert abs(meta.latitude - 19.8445) < 1e-4
    assert abs(meta.longitude - 75.3430) < 1e-4
    assert meta.width == 64 and meta.height == 48


def test_photo_interpretation_detects_content(tmp_path):
    from geospatial.photo_interpreter import interpret_photo
    from PIL import Image

    veg_path = tmp_path / "veg.jpg"
    water_path = tmp_path / "water.jpg"
    Image.new("RGB", (128, 128), (40, 130, 55)).save(veg_path, "jpeg")
    Image.new("RGB", (128, 128), (35, 95, 175)).save(water_path, "jpeg")

    veg = interpret_photo(str(veg_path))
    assert veg["available"]
    assert veg["composition_pct"]["vegetation"] > 60
    assert veg["label"] == "vegetation_dominant"

    water = interpret_photo(str(water_path))
    assert water["available"]
    assert water["composition_pct"]["water"] > 40
    assert water["label"] == "water_impoundment"


def test_cross_check_logic():
    from geospatial.photo_interpreter import cross_check_with_satellite
    analysis = {"water_area_change_ha": 1.5, "ndvi_change": 0.15}
    agree = {"available": True, "composition_pct": {"water": 30.0, "vegetation": 40.0,
                                                    "soil_or_earthwork": 10.0}}
    res = cross_check_with_satellite(agree, analysis)
    assert res["status"] == "agreement"
    conflict = {"available": True, "composition_pct": {"water": 0.0, "vegetation": 2.0,
                                                       "soil_or_earthwork": 80.0}}
    res2 = cross_check_with_satellite(conflict, analysis)
    assert res2["status"] in ("conflict", "partial_agreement")
    assert res2["conflicts"]
