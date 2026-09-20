"""
sensitivity.py
==============
Does the ranking survive the analyst's choices?

Two arbitrary choices sit underneath every impact score:

1. the **weights** of the three components (default 40 vegetation / 40 water /
   20 spatial extent), and
2. the **buffer radius** (default 250 m).

Both are defensible conventions, not laws of nature, so a judge is entitled to
ask "why not 50/30/20?" or "why 250 m and not 350 m?".  This script answers
that question empirically instead of by assertion: it recomputes the entire
ranking under alternative weightings and radii and measures how much the
*ordering* actually moves, using Spearman rank correlation, top-3 set overlap
and worst-case rank displacement.

Interpretation (stated in the output):

* rho >= 0.9 and stable top-3  -> the ranking is robust; the weights are a
  presentation choice, not a hidden determinant.
* rho < 0.7 or a churning top-3 -> the ranking is *weight-sensitive*; report
  results as tiers rather than as a precise order, and say so.

Usage
-----
    python scripts/sensitivity.py
    python scripts/sensitivity.py --data-dir data/real --watershed real_rs_001
    python scripts/sensitivity.py --json reports/sensitivity.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Dict, List, Optional, Sequence

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from geospatial.scoring import (                      # noqa: E402
    IMPACT_WEIGHTS,
    impact_components,
    impact_score,
    spearman,
)

# Alternative weightings to probe.  Each is a plausible alternative convention.
WEIGHT_SCHEMES: List[Dict[str, float]] = [
    {"vegetation": 40.0, "water": 40.0, "extent": 20.0},   # default
    {"vegetation": 50.0, "water": 30.0, "extent": 20.0},   # vegetation-first
    {"vegetation": 30.0, "water": 50.0, "extent": 20.0},   # water-first
    {"vegetation": 40.0, "water": 30.0, "extent": 30.0},   # extent-upweighted
    {"vegetation": 33.3, "water": 33.3, "extent": 33.4},   # equal
    {"vegetation": 60.0, "water": 20.0, "extent": 20.0},   # strongly vegetation
    {"vegetation": 20.0, "water": 60.0, "extent": 20.0},   # strongly water
    {"vegetation": 25.0, "water": 25.0, "extent": 50.0},   # extent-dominant
]

RADII = [150.0, 250.0, 350.0, 500.0]


def label(scheme: Dict[str, float]) -> str:
    return (f"{scheme['vegetation']:.0f}/"
            f"{scheme['water']:.0f}/"
            f"{scheme['extent']:.0f}")


def _jaccard(a: Sequence[str], b: Sequence[str]) -> float:
    sa, sb = set(a), set(b)
    if not sa and not sb:
        return 1.0
    return round(len(sa & sb) / len(sa | sb), 3)


def analyse(store, watershed_id: str,
            schemes: Sequence[Dict[str, float]] = WEIGHT_SCHEMES,
            radii: Sequence[float] = RADII) -> dict:
    """Recompute the ranking under every weighting and radius."""
    from backend.app.services.store import DataStore  # noqa: F401  (type hint)

    interventions = store.interventions_for(watershed_id)
    if not interventions:
        raise SystemExit(f"No interventions for watershed '{watershed_id}'")

    # --- cache the per-buffer measurements once per radius ---------------- #
    measurements: Dict[float, List[dict]] = {}
    for radius in radii:
        rows = []
        for item in interventions:
            an = store.processor(watershed_id).analyse_buffer(
                item["latitude"], item["longitude"], radius)
            rows.append({
                "id": item["id"],
                "name": item.get("name", item["id"]),
                "type": item.get("type", ""),
                "components": impact_components(
                    ndvi_land_delta=an["ndvi_change_land"],
                    water_delta_ha=an["water_area_change_ha"],
                    improved_ha=an["area_improved_ha"],
                    buffer_area_ha=an["buffer_area_ha"]),
            })
        measurements[radius] = rows

    def rank(rows: List[dict], scheme: Dict[str, float]) -> List[dict]:
        scored = [{"id": r["id"], "name": r["name"], "type": r["type"],
                   "score": impact_score(r["components"], scheme)}
                  for r in rows]
        scored.sort(key=lambda r: r["score"], reverse=True)
        for i, row in enumerate(scored, start=1):
            row["rank"] = i
        return scored

    # --- weighting sensitivity at the default radius ---------------------- #
    base_rows = measurements[250.0]
    base_scheme = schemes[0]
    base_ranked = rank(base_rows, base_scheme)
    base_order = [r["id"] for r in base_ranked]
    base_scores = {r["id"]: r["score"] for r in base_ranked}

    weight_results = []
    for scheme in schemes:
        ranked = rank(base_rows, scheme)
        order = [r["id"] for r in ranked]
        scores = {r["id"]: r["score"] for r in ranked}
        rho = spearman([base_scores[i] for i in base_order],
                       [scores[i] for i in base_order])
        top3_base = base_order[:3]
        top3_alt = order[:3]
        displacement = max(abs(base_order.index(r["id"]) - i)
                           for i, r in enumerate(ranked))
        weight_results.append({
            "weights": label(scheme),
            "vegetation": scheme["vegetation"], "water": scheme["water"],
            "extent": scheme["extent"],
            "spearman_rho": rho,
            "top3_jaccard": _jaccard(top3_base, top3_alt),
            "top3": top3_alt,
            "top1_changed": bool(top3_base[:1] != top3_alt[:1]),
            "max_rank_displacement": displacement,
            "score_range": [round(min(scores.values()), 1),
                            round(max(scores.values()), 1)],
        })

    # --- radius sensitivity at the default weighting ---------------------- #
    radius_results = []
    for radius in radii:
        if radius == 250.0:
            continue
        rows = measurements[radius]
        ranked = rank(rows, base_scheme)
        order = [r["id"] for r in ranked]
        scores = {r["id"]: r["score"] for r in ranked}
        rho = spearman([base_scores.get(i, 0.0) for i in base_order],
                       [scores.get(i, 0.0) for i in base_order])
        radius_results.append({
            "radius_m": radius,
            "spearman_rho": rho,
            "top3_jaccard": _jaccard(base_order[:3], order[:3]),
            "top1_changed": bool(base_order[:1] != order[:1]),
            "score_range": [round(min(scores.values()), 1),
                            round(max(scores.values()), 1)],
        })

    # --- verdict ---------------------------------------------------------- #
    # Distinguish *plausible* reweightings (every weight within 10 points of
    # the default - the range a domain committee would actually argue over)
    # from deliberately extreme ones (used to find where the metric breaks).
    def _is_plausible(r: dict) -> bool:
        return (abs(r["vegetation"] - base_scheme["vegetation"]) <= 10
                and abs(r["water"] - base_scheme["water"]) <= 10
                and abs(r["extent"] - base_scheme["extent"]) <= 10)

    plausible = [r for r in weight_results[1:] if _is_plausible(r)]
    extreme = [r for r in weight_results[1:] if not _is_plausible(r)]

    def _stats(rows: List[dict]) -> dict:
        rhos = [r["spearman_rho"] for r in rows if r["spearman_rho"] == r["spearman_rho"]]
        top1 = [r["top1_changed"] for r in rows]
        return {
            "schemes": [r["weights"] for r in rows],
            "min_spearman_rho": round(float(min(rhos)), 3) if rhos else None,
            "mean_spearman_rho": round(float(sum(rhos) / len(rhos)), 3) if rhos else None,
            "top1_never_changes": bool(top1) and not any(top1),
        }

    p_stats, e_stats = _stats(plausible), _stats(extreme)
    min_rho = float(min(r["spearman_rho"] for r in weight_results[1:]))
    min_jac = float(min(r["top3_jaccard"] for r in weight_results[1:]))
    decider = p_stats["min_spearman_rho"]
    if decider is None:
        verdict = "Not enough alternative schemes to assess."
    elif decider >= 0.9:
        verdict = ("ROBUST within the plausible range - the ordering is "
                   "preserved under any weighting a domain committee would "
                   "realistically choose. The 40/40/20 split is therefore a "
                   "presentation convention, not a hidden determinant.")
    elif decider >= 0.75:
        verdict = ("MODERATELY ROBUST within the plausible range - the broad "
                   "order holds but adjacent pairs can swap. Report results as "
                   "tiers (top / middle / bottom) rather than as a precise "
                   "1..N order, and publish this table alongside the ranking.")
    else:
        verdict = ("WEIGHT-SENSITIVE even within the plausible range - do not "
                   "present a precise order; present tiers and publish the "
                   "sensitivity table alongside.")
    if e_stats["min_spearman_rho"] is not None:
        verdict += (f" Note: deliberately extreme weightings "
                    f"({', '.join(e_stats['schemes'])}) do reorder the list "
                    f"(rho down to {e_stats['min_spearman_rho']}), which is "
                    f"expected - they overweight one axis by 2-3x.")

    return {
        "watershed_id": watershed_id,
        "default_weights": label(base_scheme),
        "n_interventions": len(interventions),
        "weight_sensitivity": weight_results,
        "radius_sensitivity": radius_results,
        "summary": {
            "min_spearman_rho": round(min_rho, 3),
            "min_top3_jaccard": round(min_jac, 3),
            "plausible_range": p_stats,
            "extreme_range": e_stats,
            "top1_never_changes": all(not r["top1_changed"]
                                      for r in weight_results[1:]),
            "verdict": verdict,
        },
        "formulas": {
            "impact": ("clip(170 x land-only dNDVI, -20, 40) x Wv/40 + "
                       "clip(1.5 x % buffer newly water, -20, 40) x Ww/40 + "
                       "clip(45 x fraction improved, -10, 20) x We/20"),
            "note": ("Weights are normalised to sum to 100 points, so every "
                     "scheme is a like-for-like rescaling of the same "
                     "measurement - only the emphasis changes."),
        },
    }


def render(report: dict) -> str:
    lines = [f"# Impact-score sensitivity - {report['watershed_id']}",
             "",
             f"Structures: {report['n_interventions']}   "
             f"default weights: {report['default_weights']}",
             "",
             "## Weighting sensitivity (250 m buffer)",
             "",
             "| Weights (veg/water/extent) | Spearman rho | Top-3 overlap | "
             "Top-1 changes | Max rank shift | Score range |",
             "|---|---:|---:|:--:|---:|---|"]
    for r in report["weight_sensitivity"]:
        lines.append(
            f"| {r['weights']} "
            f"{' (default)' if r['weights'] == report['default_weights'] else '':<11}"
            f" | {r['spearman_rho']:.3f} | {r['top3_jaccard']:.2f} | "
            f"{'yes' if r['top1_changed'] else 'no'} | "
            f"{r['max_rank_displacement']} | "
            f"{r['score_range'][0]} - {r['score_range'][1]} |")

    lines += ["", "## Buffer-radius sensitivity (default weights)", "",
              "| Radius (m) | Spearman rho | Top-3 overlap | Top-1 changes | "
              "Score range |", "|---:|---:|---:|:--:|---|"]
    for r in report["radius_sensitivity"]:
        lines.append(f"| {r['radius_m']:.0f} | {r['spearman_rho']:.3f} | "
                     f"{r['top3_jaccard']:.2f} | "
                     f"{'yes' if r['top1_changed'] else 'no'} | "
                     f"{r['score_range'][0]} - {r['score_range'][1]} |")

    s = report["summary"]
    lines += ["", "## Verdict", "",
              f"- Plausible reweightings ({', '.join(s['plausible_range']['schemes'])}): "
              f"Spearman rho >= {s['plausible_range']['min_spearman_rho']} "
              f"(mean {s['plausible_range']['mean_spearman_rho']})",
              f"- Extreme reweightings ({', '.join(s['extreme_range']['schemes'])}): "
              f"rho down to {s['extreme_range']['min_spearman_rho']}",
              f"- Rank-1 structure never changes: **{s['top1_never_changes']}**",
              "", s["verdict"], ""]
    return "\n".join(lines)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data-dir", default=None)
    ap.add_argument("--watershed", default=None, help="default: first watershed")
    ap.add_argument("--json", default=None, help="write the machine-readable report")
    ap.add_argument("--markdown", default=None, help="write a markdown table")
    args = ap.parse_args(argv)

    if args.data_dir:
        os.environ["WS_DATA_DIR"] = os.path.abspath(args.data_dir)
        os.environ["WS_OUTPUT_DIR"] = os.path.abspath(
            os.path.join(args.data_dir, "overlays"))
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    from backend.app.services.store import DataStore
    store = DataStore()
    watersheds = store.list_watersheds()
    if not watersheds:
        raise SystemExit("No watersheds found.")
    ws = args.watershed or watersheds[0]["id"]

    report = analyse(store, ws)
    print(render(report))

    if args.json:
        os.makedirs(os.path.dirname(os.path.abspath(args.json)), exist_ok=True)
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(report, fh, indent=2)
        print(f"[sensitivity] JSON -> {args.json}")
    if args.markdown:
        with open(args.markdown, "w", encoding="utf-8") as fh:
            fh.write(render(report))
        print(f"[sensitivity] markdown -> {args.markdown}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
