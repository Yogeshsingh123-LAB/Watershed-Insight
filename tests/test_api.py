"""
test_api.py - end-to-end tests of the FastAPI surface.

These tests exercise the real endpoints against the shipped sample dataset and
assert the *shape and consistency* of the analytical payloads (areas add up,
scores are bounded, generated PDFs are valid documents).
"""

from __future__ import annotations

import io
import os
import sys

import pytest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.app.main import app  # noqa: E402
from backend.app.services.store import get_store  # noqa: E402

WS = "watershed_001"


@pytest.fixture(scope="module")
def client():
    from fastapi.testclient import TestClient

    if not os.path.exists(os.path.join(BASE_DIR, "data", "sample", "catalog", "watersheds.json")):
        pytest.skip("Sample dataset not generated - run scripts/generate_sample_data.py")
    with TestClient(app) as c:
        yield c


# --------------------------------------------------------------------------- #
# Meta & catalog
# --------------------------------------------------------------------------- #
def test_health(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "online"
    assert body["watersheds"] >= 1


def test_root_metadata(client):
    body = client.get("/").json()
    assert body["problem_statement"] == "SIH PS26015"


def test_catalog_hierarchy(client):
    body = client.get("/api/v1/watersheds/catalog").json()
    assert body["hierarchy"]
    state = body["hierarchy"][0]
    district = state["districts"][0]
    block = district["blocks"][0]
    assert block["watersheds"]
    assert block["watersheds"][0]["id"] in body["watersheds"]


def test_list_and_detail(client):
    listing = client.get("/api/v1/watersheds").json()
    assert listing["count"] >= 1
    detail = client.get(f"/api/v1/watersheds/{WS}").json()
    assert detail["boundary"]["geometry"]["type"] == "Polygon"
    assert detail["stats"]["total_area_ha"] > 100
    assert len(detail["epochs"]) >= 2


def test_unknown_watershed_returns_404(client):
    assert client.get("/api/v1/watersheds/does_not_exist").status_code == 404


# --------------------------------------------------------------------------- #
# Analytics
# --------------------------------------------------------------------------- #
def test_watershed_summary_is_complete(client):
    body = client.get(f"/api/v1/watersheds/{WS}/summary").json()
    for key in ("watershed", "stats", "epochs", "timeseries", "lulc",
                "change_detection", "terrain", "ranking", "photo_stats",
                "interventions", "photos", "streams", "hotspots"):
        assert key in body, f"summary is missing '{key}'"
    assert body["interventions"]["type"] == "FeatureCollection"
    assert body["photos"]["type"] == "FeatureCollection"


def test_stats_are_internally_consistent(client):
    stats = client.get(f"/api/v1/watersheds/{WS}/stats").json()
    assert abs(stats["ndvi_change"] - (stats["ndvi_mean_t1"] - stats["ndvi_mean_t0"])) < 1e-6
    assert abs(stats["water_area_change_ha"]
               - (stats["water_area_ha_t1"] - stats["water_area_ha_t0"])) < 1e-6
    assert 0 <= stats["water_area_ha_t1"] <= stats["total_area_ha"]


def test_lulc_transition_conservation(client):
    lulc = client.get(f"/api/v1/watersheds/{WS}/lulc").json()
    tr = lulc["transition"]
    assert abs(tr["changed_area_ha"] + tr["unchanged_area_ha"] - tr["total_area_ha"]) < 0.5
    shares = sum(lulc["shares_t1_pct"].values())
    assert abs(shares - 100.0) < 0.5


def test_change_detection_partitions_area(client):
    cd = client.get(f"/api/v1/analytics/{WS}/change-detection?index=ndvi").json()
    total = sum(c["pct_of_area"] for c in cd["change_classes"].values())
    assert abs(total - 100.0) < 0.5
    assert set(cd["change_classes"]) == {"large_decline", "decline", "stable",
                                         "improvement", "large_improvement"}


def test_hotspots_return_block_geometry(client):
    hs = client.get(f"/api/v1/analytics/{WS}/hotspots?top_n=3").json()
    assert len(hs["gainers"]) == 3
    assert hs["gainers"][0]["mean_delta"] >= hs["losers"][0]["mean_delta"]
    assert "lat" in hs["gainers"][0] and "lon" in hs["gainers"][0]


def test_drainage_and_terrain(client):
    dr = client.get(f"/api/v1/watersheds/{WS}/drainage").json()
    assert dr["streams"]["features"]
    assert dr["morphometry"]["drainage_density_km_per_km2"] > 0
    tr = client.get(f"/api/v1/watersheds/{WS}/terrain").json()
    assert tr["slope_classes_ha"]
    assert len(tr["elevation_profile"]) == 10


def test_overlays_are_served(client):
    ov = client.get(f"/api/v1/watersheds/{WS}/overlays").json()
    assert "ndvi" in ov["overlays"]
    url = ov["overlays"]["ndvi"]
    res = client.get(url)
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("image/png")


def test_compare_all_indices(client):
    body = client.get(f"/api/v1/analytics/{WS}/compare").json()
    assert set(body["indices"]) == {"ndvi", "ndwi", "ndbi", "savi"}


# --------------------------------------------------------------------------- #
# Interventions
# --------------------------------------------------------------------------- #
def test_interventions_geojson(client):
    fc = client.get(f"/api/v1/interventions?watershed_id={WS}").json()
    assert fc["features"]
    for feat in fc["features"]:
        assert feat["geometry"]["type"] == "Point"
        assert feat["properties"]["id"].startswith("INT-")


def test_ranking_is_sorted_and_bounded(client):
    body = client.get(f"/api/v1/interventions/ranking?watershed_id={WS}").json()
    rows = body["ranking"]
    assert rows
    scores = [r["impact_score"] for r in rows]
    assert scores == sorted(scores, reverse=True)
    assert all(0 <= s <= 100 for s in scores)
    assert all(r["recommendation"] for r in rows)


def test_intervention_analysis_bundle(client):
    int_id = client.get(f"/api/v1/interventions/ranking?watershed_id={WS}").json()["ranking"][0]["id"]
    body = client.get(f"/api/v1/interventions/{int_id}/analysis").json()
    a = body["analysis"]
    assert a["buffer_area_ha"] > 0
    assert 0 <= a["impact_score"] <= 100
    assert a["confidence"] in ("High", "Moderate", "Low-Moderate", "Inconclusive")
    assert body["timeseries"]
    assert body["lulc"]["classes"]
    # Every matched photo must actually belong to this intervention.
    for photo in body["matched_photos"]:
        assert photo["intervention_id"] == int_id


def test_buffer_radius_changes_area(client):
    int_id = client.get(f"/api/v1/interventions/ranking?watershed_id={WS}").json()["ranking"][0]["id"]
    small = client.get(f"/api/v1/interventions/{int_id}/analysis?radius_m=100").json()["analysis"]
    large = client.get(f"/api/v1/interventions/{int_id}/analysis?radius_m=400").json()["analysis"]
    assert large["buffer_area_ha"] > small["buffer_area_ha"]


def test_catchment_delineation(client):
    int_id = client.get(f"/api/v1/interventions/ranking?watershed_id={WS}").json()["ranking"][0]["id"]
    body = client.get(f"/api/v1/interventions/{int_id}/catchment").json()
    assert body["catchment"]["area_ha"] > 0
    assert body["catchment"]["geometry"]["type"] == "Polygon"


# --------------------------------------------------------------------------- #
# Photos
# --------------------------------------------------------------------------- #
def test_photo_stats_and_list(client):
    stats = client.get(f"/api/v1/photos/stats?watershed_id={WS}").json()
    assert stats["total"] > 0
    assert stats["with_gps"] + stats["without_gps"] == stats["total"]
    photos = client.get(f"/api/v1/photos?watershed_id={WS}").json()["photos"]
    assert len(photos) == stats["total"]
    assert all(p["photo_id"] for p in photos)


def test_photo_interpretation(client):
    photo_id = client.get(f"/api/v1/photos?watershed_id={WS}").json()["photos"][0]["photo_id"]
    body = client.get(f"/api/v1/photos/{photo_id}/interpretation").json()
    assert body["available"]
    assert 0 <= body["composition_pct"]["vegetation"] <= 100
    assert body["label"]


def test_photo_upload_binds_to_intervention(client):
    """Upload a JPEG with EXIF GPS next to a known structure."""
    import piexif
    from PIL import Image

    ranking = client.get(f"/api/v1/interventions/ranking?watershed_id={WS}").json()["ranking"]
    target = ranking[0]
    lat, lon = target["latitude"], target["longitude"]

    def to_dms(value):
        deg = int(abs(value))
        minute_float = (abs(value) - deg) * 60
        minute = int(minute_float)
        sec = int(round((minute_float - minute) * 60 * 100))
        return [(deg, 1), (minute, 1), (sec, 100)]

    gps = {
        piexif.GPSIFD.GPSLatitudeRef: "N", piexif.GPSIFD.GPSLatitude: to_dms(lat),
        piexif.GPSIFD.GPSLongitudeRef: "E", piexif.GPSIFD.GPSLongitude: to_dms(lon),
    }
    exif = piexif.dump({"0th": {piexif.ImageIFD.Make: "pytest"},
                        "Exif": {piexif.ExifIFD.DateTimeOriginal: "2026-08-01 10:00:00"},
                        "GPS": gps})

    buf = io.BytesIO()
    Image.new("RGB", (320, 240), (60, 120, 70)).save(buf, "jpeg", exif=exif, quality=85)
    buf.seek(0)

    res = client.post(
        "/api/v1/photos/upload",
        files={"files": ("pytest_upload.jpg", buf.getvalue(), "image/jpeg")},
        data={"watershed_id": WS},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["uploaded"] == 1
    uploaded = body["photos"][0]
    assert abs(uploaded["latitude"] - lat) < 1e-4
    assert uploaded["intervention_id"] == target["id"]
    assert uploaded["within_buffer"] is True


def test_photo_geojson_has_only_positioned_photos(client):
    fc = client.get(f"/api/v1/photos/geojson?watershed_id={WS}").json()
    for feat in fc["features"]:
        lon, lat = feat["geometry"]["coordinates"]
        assert -180 <= lon <= 180 and -90 <= lat <= 90


# --------------------------------------------------------------------------- #
# Reports
# --------------------------------------------------------------------------- #
def test_intervention_pdf_is_valid(client):
    int_id = client.get(f"/api/v1/interventions/ranking?watershed_id={WS}").json()["ranking"][0]["id"]
    res = client.post(f"/api/v1/reports/intervention/{int_id}")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content[:4] == b"%PDF"
    assert len(res.content) > 20_000


def test_watershed_pdf_is_valid(client):
    res = client.post(f"/api/v1/reports/watershed/{WS}")
    assert res.status_code == 200
    assert res.content[:4] == b"%PDF"
    assert len(res.content) > 50_000


def test_report_listing(client):
    body = client.get("/api/v1/reports").json()
    assert body["count"] >= 2
    assert body["reports"][0]["filename"].endswith(".pdf")


def test_unknown_intervention_404(client):
    assert client.get("/api/v1/interventions/INT-NOPE-999/analysis").status_code == 404
