"""
verify_pipeline.py
==================
One-command end-to-end verification of the Watershed Insight platform.

It walks the whole analytical chain - DATA -> INFORMATION -> ANALYSIS ->
INTERPRETATION -> DECISION SUPPORT - and prints a pass/fail table, so an
evaluator (or a CI job) can confirm the installation in a few seconds.

Usage
-----
    python scripts/verify_pipeline.py                 # offline checks
    python scripts/verify_pipeline.py --api http://127.0.0.1:8000
    python scripts/verify_pipeline.py --pdf           # also render both PDFs
"""

from __future__ import annotations

import argparse
import os
import sys
import time
import traceback

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

OK, FAIL, WARN = "PASS", "FAIL", "WARN"
_results = []


def check(name: str, fn, *args, **kwargs):
    """Run one verification step and record the outcome."""
    started = time.time()
    try:
        detail = fn(*args, **kwargs)
        status = OK if detail is not False else FAIL
        text = "" if detail in (True, None) else str(detail)
    except Exception as exc:  # noqa: BLE001 - report, do not crash
        status, text = FAIL, f"{type(exc).__name__}: {exc}"
        if "--debug" in sys.argv:
            traceback.print_exc()
    elapsed = (time.time() - started) * 1000
    _results.append((status, name, text, elapsed))
    return status == OK


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify the Watershed Insight pipeline")
    parser.add_argument("--api", default=None, help="Base URL of a running API (e.g. http://127.0.0.1:8000)")
    parser.add_argument("--pdf", action="store_true", help="Also generate both PDF documents")
    parser.add_argument("--watershed", default=None, help="Watershed id to verify (default: first in catalog)")
    parser.add_argument("--debug", action="store_true", help="Print tracebacks")
    args = parser.parse_args()

    print("=" * 78)
    print("  WATERSHED INSIGHT - PIPELINE VERIFICATION (SIH PS26015)")
    print("=" * 78)

    from backend.app.services.store import get_store

    # ------------------------- 1. DATA LAYER ------------------------------ #
    store = get_store()
    ws_id = args.watershed

    def _catalog():
        catalog = store.catalog
        ids = list(catalog.get("watersheds", {}))
        assert ids, "empty catalog - run scripts/generate_sample_data.py"
        return f"{len(ids)} watershed(s): {', '.join(ids)}"

    check("1.1 Catalog / administrative hierarchy", _catalog)
    if not ws_id:
        ws_id = list(store.catalog.get("watersheds", {}))[0]

    check("1.2 Micro-watershed boundary",
          lambda: f"{store.watershed_meta(ws_id)['area_ha']} ha polygon")
    check("1.3 IWMP interventions",
          lambda: f"{len(store.interventions_for(ws_id))} structures")
    check("1.4 DEM (terrain model)",
          lambda: f"relief {store.terrain(ws_id).stats['total_relief_m']} m")
    check("1.5 Multi-epoch satellite stack",
          lambda: f"{len(store.processor(ws_id).epochs)} acquisitions")
    check("1.6 Geo-coded photo archive",
          lambda: f"{len(store.photos_for(ws_id))} photographs indexed")

    # ------------------------ 2. INFORMATION ------------------------------ #
    def _indices():
        proc = store.processor(ws_id)
        ndvi = proc.index(proc.t1_key, "ndvi")
        return f"NDVI {ndvi.mean():.3f} mean, shape {ndvi.shape}"

    check("2.1 Spectral indices (NDVI/NDWI/NDBI/SAVI)", _indices)
    check("2.2 EXIF extraction & spatial binding",
          lambda: f"{store.photo_stats(ws_id)['verified']} verified of {store.photo_stats(ws_id)['total']}")
    check("2.3 LULC classification",
          lambda: f"{len(store.lulc_summary(ws_id)['classes'])} classes mapped")
    check("2.4 Drainage network & morphometry",
          lambda: f"{store.terrain(ws_id).stats['stream_length_km']} km of channels")

    # -------------------------- 3. ANALYSIS ------------------------------- #
    check("3.1 Watershed statistics",
          lambda: f"ΔNDVI {store.watershed_stats(ws_id)['ndvi_change']:+.4f}, "
                  f"Δwater {store.watershed_stats(ws_id)['water_area_change_ha']:+.2f} ha")
    check("3.2 Change detection",
          lambda: f"{store.change_detection(ws_id)['pct_improved_area']:.1f} % of area improved")
    check("3.3 Change hotspots",
          lambda: f"{len(store.hotspots(ws_id)['blocks'])} blocks ranked")
    check("3.4 Map overlay rendering",
          lambda: os.path.basename(store.overlay_path(ws_id, "ndvi")))
    check("3.5 Catchment delineation (DEM)",
          lambda: f"{store.drainage(ws_id, *store.interventions_for(ws_id)[0]['latitude'] if False else ())['morphometry']['basin_area_ha']:.0f} ha basin")

    # ----------------------- 4. INTERPRETATION ---------------------------- #
    def _ranking():
        rows = store.ranking(ws_id)
        top = rows[0]
        return f"{len(rows)} ranked; top {top['id']} = {top['impact_score']:.0f}/100 ({top['confidence']})"

    check("4.1 Intervention impact ranking", _ranking)

    def _analysis():
        int_id = store.ranking(ws_id)[0]["id"]
        bundle = store.intervention_analysis(int_id, 250)
        a = bundle["analysis"]
        return (f"{int_id}: ΔNDVI(land) {a['ndvi_change_land']:+.3f}, "
                f"Δwater {a['water_area_change_ha']:+.2f} ha, score {a['impact_score']:.0f}")

    check("4.2 Buffer evidence bundle", _analysis)
    check("4.3 Photo content interpretation",
          lambda: store.photo_interpretation(store.photos_for(ws_id)[0].photo_id)["label_text"])

    # ---------------------- 5. DECISION SUPPORT --------------------------- #
    if args.pdf:
        from reports.pdf_generator import generate_intervention_pdf, generate_watershed_pdf

        out_dir = os.path.join(BASE_DIR, "reports", "generated")
        os.makedirs(out_dir, exist_ok=True)
        int_id = store.ranking(ws_id)[0]["id"]

        def _int_pdf():
            path = generate_intervention_pdf(store, int_id,
                                             os.path.join(out_dir, f"VERIFY_{int_id}.pdf"), 250)
            return f"{os.path.getsize(path)/1024:.0f} KB"

        def _ws_pdf():
            path = generate_watershed_pdf(store, ws_id,
                                          os.path.join(out_dir, f"VERIFY_{ws_id}.pdf"), 250)
            return f"{os.path.getsize(path)/1024:.0f} KB"

        check("5.1 Intervention evidence pack (PDF)", _int_pdf)
        check("5.2 Watershed assessment report (PDF)", _ws_pdf)

    # --------------------------- 6. REST API ------------------------------ #
    if args.api:
        import json
        import urllib.request

        def _get(path):
            with urllib.request.urlopen(f"{args.api.rstrip('/')}{path}", timeout=120) as r:
                return json.loads(r.read().decode())

        check("6.1 GET /api/v1/health", lambda: _get("/api/v1/health")["status"])
        check("6.2 GET /api/v1/watersheds/{id}/summary",
              lambda: f"{len(_get(f'/api/v1/watersheds/{ws_id}/summary'))} top-level keys")
        check("6.3 GET /api/v1/interventions/ranking",
              lambda: f"{len(_get(f'/api/v1/interventions/ranking?watershed_id={ws_id}')['ranking'])} rows")
        check("6.4 GET /api/v1/photos/stats",
              lambda: f"{_get(f'/api/v1/photos/stats?watershed_id={ws_id}')['verified_pct']} % verified")

    # ---------------------------- summary --------------------------------- #
    print()
    width = max(len(name) for _, name, _, _ in _results) + 2
    for status, name, text, elapsed in _results:
        colour = {"PASS": "\033[92m", "FAIL": "\033[91m", "WARN": "\033[93m"}[status]
        print(f"  [{colour}{status}\033[0m] {name:<{width}} {text}  \033[90m({elapsed:.0f} ms)\033[0m")

    passed = sum(1 for r in _results if r[0] == OK)
    failed = sum(1 for r in _results if r[0] == FAIL)
    print("\n" + "-" * 78)
    print(f"  {passed} passed, {failed} failed, {len(_results)} checks total")
    print("-" * 78)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
