# Validation Report

**Watershed Insight · SIH PS26015** — what has actually been verified, against
what data, and what has *not*.

This document exists because "the tests pass" and "the measurements are right"
are different claims. The test suite (64 tests) proves the software is
self-consistent; this report is about correctness against reality.

---

## 1 · Validation tiers

| Tier | Question | Status |
| :--- | :--- | :--- |
| **T1 — Software correctness** | Does the code do what the code says? | ✅ 64 automated tests |
| **T2 — Measurement calibration** | Are the hectares real hectares and the deltas real deltas? | ✅ 15 known-answer tests |
| **T3 — Real-data operation** | Does the pipeline run on actual satellite imagery, with real clouds and real terrain? | ✅ Verified on Sentinel-2 (this document) |
| **T4 — Scientific validity** | Do the scores correspond to real ground outcomes? | ⚠️ **Not yet** — requires a verified structure inventory (§6) |

T4 is the honest gap. Everything below is about how far T1–T3 were pushed and
what T4 would take.

---

## 2 · Real-data validation AOI

| | |
| :--- | :--- |
| **Site** | Ralegaon Siddhi, Parner taluka, Ahmednagar district, Maharashtra |
| **Why this site** | The most-cited village-level watershed-development case in India (IWMP / PMKSY-WDC legacy) — the natural first real-world test for PS26015 |
| **Window** | 74.6208–74.6458 °E, 19.2122–19.2372 °N (~2.72 km square, **726.42 ha**) |
| **Imagery** | **Sentinel-2 MSI L2A**, tile MGRS 43QDB, 6 acquisitions |
| **DEM** | AWS Terrain Tiles (terrarium, ~30 m source), resampled to the analysis grid |
| **Access** | Fully public — STAC API + COG range requests, **no account, token or API key** |

Reproduce with:

```bash
pip install -r requirements-optional.txt
python scripts/ingest_sentinel.py --out data/real --site-candidates 6
WS_DATA_DIR=data/real python -m uvicorn backend.app.main:app
```

### 2.1 The six real acquisitions

| # | Date | Season | Scene cloud | **Pixels actually observed** | NDVI | NDWI |
| ---: | :--- | :--- | ---: | ---: | ---: | ---: |
| T0 | 2024-05-03 | Pre-monsoon | 0.00 % | 100.0 % | 0.1389 | −0.262 |
| — | 2024-11-29 | Post-monsoon | 0.00 % | 100.0 % | 0.3617 | −0.506 |
| — | 2025-04-20 | Pre-monsoon | 0.00 % | 100.0 % | 0.1584 | −0.296 |
| — | 2025-11-14 | Post-monsoon | 0.00 % | 100.0 % | 0.4821 | −0.545 |
| T1 | 2026-05-28 | Pre-monsoon | 0.00 % | 100.0 % | 0.1494 | −0.278 |
| — | 2026-09-15 | Monsoon | 17.98 % | **62.7 %** | 0.2907 | −0.360 |

Three things to read off this table:

1. **The real monsoon cycle is recovered correctly.** Pre-monsoon NDVI sits at
   0.14–0.16; post-monsoon it jumps to 0.36 (2024) and 0.48 (2025). That is the
   agricultural year of a rainfed Deccan watershed, measured, not simulated.
2. **Cloud masking demonstrably works.** The one cloudy scene reports
   **62.7 % observed** — 37.3 % of the window was cloud, cloud shadow or cirrus
   and was excluded rather than silently averaged in. The five clear scenes
   report 100 %.
3. **There is a greening trend**: post-monsoon NDVI rose 0.362 → 0.482 between
   2024 and 2025.

### 2.2 Terrain and drainage from the real DEM

| Parameter | Value |
| :--- | ---: |
| Relief | 44.33 m (elevations ~585–629 m) |
| Mean slope | 4.89 % |
| Channel length | 29.94 km |
| Max Strahler order | 4 |
| Drainage density | 4.09 km/km² |
| Mean TWI | 7.41 |

The D8 → accumulation → Strahler → catchment chain runs end-to-end on real
topography, not a synthetic inclined plane.

### 2.3 Land use / land cover (T1, pre-monsoon 2026)

| Class | Area (ha) | Share |
| :--- | ---: | ---: |
| Bare / fallow | 463.83 | 63.9 % |
| Scrub / degraded | 237.12 | 32.6 % |
| Cropland | 19.45 | 2.7 % |
| Built-up / hardpan | 7.84 | 1.1 % |
| Dense vegetation | 3.08 | 0.4 % |
| Water | 0.00 | 0.0 % |
| **Class change T0 → T1** | **91.34 ha (12.5 %)** | |

This is a credible pre-monsoon image of a semi-arid Deccan landscape: two-thirds
fallowscrub, a couple of percent actively cropped, ~1 % settlement.

---

## 3 · What real data changed in the engine

Three defects and one calibration fault were **found by running on real data**
and then fixed. None of them were visible in the synthetic dataset — which is
the entire argument for this exercise.

### 3.1 NaN propagated through every headline statistic (fixed)

Real data has masked pixels. `np.average` propagates NaN, so the cloudy 2026-09
epoch reported `ndvi: null` for the whole watershed. All statistics now route
through `nan_weighted_mean()`, which ignores masked observations and returns NaN
only when *nothing* was observed. Added `observed_fraction` to the time-series
payload so the UI can show completeness.

### 3.2 NDBI is not a built-up detector over dry basalt (fixed by recalibration)

The textbook rule `NDBI > 0.02 ⇒ built-up` labelled **470 ha (65 %) of a rural
watershed as settlement**. Measured over this AOI:

| NDBI percentile | Value |
| :--- | ---: |
| p1 | +0.013 |
| **median** | **+0.136** |
| p90 | +0.180 |
| p99 | +0.236 |

Dry fallow basalt has SWIR (0.286) > NIR (0.218), so NDBI is strongly positive
*everywhere*. NDBI separates built-up from **vegetation**, not from **bare
soil**; in a semi-arid landscape it is simply the wrong tool. The threshold was
raised to **0.20**, which selects the genuine hardpan/settlement tail
(7.84 ha, ~1 %) — consistent with one village plus compacted surfaces.

**Residual honesty:** with VNIR+SWIR alone, bare soil and built-up remain
spectrally confusable. The `builtup` class should be treated as provisional and
validated against a settlement reference layer (GHSL, or a digitised revenue
map) before it is used for targeting.

### 3.3 No water is detectable pre-monsoon — and that is a finding, not a bug

| Test | Pre-monsoon 2026 | Post-monsoon 2025 |
| :--- | ---: | ---: |
| Min SWIR reflectance | 0.1237 | **0.0264** |
| Max McFeeters NDWI | −0.018 | +0.386 |
| Max MNDWI (Xu) | −0.058 | +0.099 |
| Water at NDWI > 0.10 | 0.00 ha | 0.16 ha |

The zero is real: there is genuinely no open water in this 726 ha window in May.
A small water body (~0.16 ha) *does* appear post-monsoon. Reporting "0.00 ha"
took confidence; padding it would have been the error.

### 3.4 Thresholds are now data, not code

Because a cut-off tuned on one landscape does not transfer to another, LULC and
index thresholds moved into `geospatial.lulc.DEFAULT_THRESHOLDS` and can be
overridden per dataset by a `calibration.json` beside the catalog. `data/real/calibration.json`
carries the recalibrated values **and the measured distributions that justify
them**, so the next terrain can be calibrated the same way instead of by guesswork.

---

## 4 · Background comparison — is a score of 65 actually high?

A score means nothing without a baseline. The platform therefore runs the
**identical scoring chain at 200 seeded random control points** inside the
boundary and reports each structure's percentile against that background.

| Dataset | Background (n = 200) | Interpretation |
| :--- | :--- | :--- |
| Synthetic (`watershed_001`) | mean **27.9**, sd 18.0, median 27.6, p95 55.0 | Top structure at 64.7 sits at the **97th percentile** — a strong, discriminated signal |
| **Real** (`real_rs_001`) | mean **2.37**, sd 2.17, median 2.0, p95 6.8 | Candidate sites score 1.4–3.6 → percentiles 32–85 |

### The real-data result is a correct negative

The six sites in the real AOI are **DEM-sited candidates, not surveyed
structures** — nothing has been built at them. The platform measures
1.4–3.6 against a background of 2.37 ± 2.17: no site is distinguishable from
background, at 70/100 confidence.

That is exactly the right answer, and it is a stronger validation than a
positive result would have been: the system did not manufacture impact where no
intervention exists. It also demonstrates the failure mode the whole
net-of-background machinery exists to prevent — without the control comparison,
"impact = 3.6" would have been presented as a number rather than as noise.

Alongside the percentile, each assessment now reports a
**difference-in-differences** figure:

```
net change = buffer ΔNDVI(land) − watershed-wide ΔNDVI(land)
```

For the top synthetic structure: buffer +0.072, watershed +0.047, **net +0.025**.
Roughly a third of the apparent buffer improvement is landscape-wide greening
that would have happened anyway.

---

## 5 · Weighting sensitivity — answering "why 40/40/20?"

Regenerated by `python scripts/sensitivity.py` (results in
`reports/sensitivity_sample.json` and `reports/sensitivity_real.json`).

### Synthetic watershed (`watershed_001`, 10 structures)

| Weights (veg/water/extent) | Spearman ρ | Top-3 overlap | Top-1 changes | Max rank shift |
| :--- | ---: | ---: | :--- | ---: |
| **40/40/20 (default)** | 1.000 | 1.00 | — | 0 |
| 50/30/20 | 0.867 | 0.50 | yes | 2 |
| 30/50/20 | **1.000** | 1.00 | no | 0 |
| 40/30/30 | 0.867 | 0.50 | yes | 2 |
| 33/33/33 | 0.952 | 0.50 | no | 2 |
| 60/20/20 | 0.539 | 0.20 | yes | 5 |
| 20/60/20 | 0.903 | 0.50 | no | 2 |
| 25/25/50 | 0.430 | 0.20 | yes | 7 |

**Verdict: MODERATELY ROBUST.** Across *plausible* reweightings (every weight
within 10 points of default) ρ ≥ **0.867**, mean 0.911. Deliberately extreme
weightings do reorder the list (ρ down to 0.43), which is expected when one axis
is overweighted 2–3×.

### Real AOI (`real_rs_001`, 6 candidates)

**Verdict: ROBUST.** Plausible reweightings give ρ ≥ **0.986** (mean 0.995) and
the rank-1 site never changes.

### Buffer-radius sensitivity

| Radius | Synthetic ρ | Real ρ |
| ---: | ---: | ---: |
| 150 m | 0.766 | 0.986 |
| **250 m (default)** | — | — |
| 350 m | 0.964 | 0.868 |
| 500 m | 0.964 | 0.985 |

### What we therefore claim

> The 40/40/20 split is a **presentation convention, not a determinant**. The
> ranking is stable under any weighting a domain committee would plausibly
> choose, and unstable only under weightings that overweight one axis by 2–3×.
> We publish the sensitivity table alongside the ranking and recommend reading
> it as **tiers rather than a precise 1..N order**.

That is the defensible answer to "why not 50/30/20?" — measured, not asserted.

---

## 6 · What is NOT yet validated (T4), and the plan to close it

| Gap | Why it matters | Plan |
| :--- | :--- | :--- |
| **No verified structure inventory** | Impact attribution is unproven: the real AOI's sites are DEM-sited candidates, so the correct negative result does not demonstrate *detection* | Obtain a district PMKSY-WDC inventory (structure type, GPS, commissioning date) for one project area and replace `interventions.geojson` — a data substitution, no code change |
| **No ground truth for LULC** | Class areas are plausible but unvalidated | Compare against BHUVAN LULC or NNRMS for the same window; report a confusion matrix |
| **No field photographs on the real AOI** | The DRISHTI half of the evidence chain is untested against real photos | Ingest a DRISHTI export for the same AOI via `/api/v1/photos/upload` |
| **Single AOI, single terrain** | Threshold calibration may not transfer | Repeat ingestion for 2–3 contrasting AOIs (e.g. a humid tributary, a coastal watershed) and compare `calibration.json` values |
| **Water detection on small tanks** | The AOI's only water body is ~0.16 ha; small farm ponds are sub-pixel at 10 m | Validate against a surveyed tank polygon; consider a sub-pixel water fraction index |

Each of these is a **data** task, not a code task. That is the point of the
adapter architecture: `scripts/ingest_sentinel.py` already converted public
Sentinel-2 into the engine's contract without a single change to the analysis
engine.

---

## 7 · Reproducing this report

```bash
# real-data ingestion
python scripts/ingest_sentinel.py --out data/real --site-candidates 6

# background comparison + sensitivity
python scripts/sensitivity.py --data-dir data/real --json reports/sensitivity_real.json
python scripts/sensitivity.py --data-dir data/sample --json reports/sensitivity_sample.json

# calibration & known-answer tests
python -m pytest tests/test_calibration.py -v
```
