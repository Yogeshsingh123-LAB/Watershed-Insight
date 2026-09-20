# SIH Presentation Prep

**Watershed Insight · PS26015** — pitch, judge Q&A, and validation plan.

---

## 1 · The 3-minute pitch

> **Slide 1 — The problem.**
> India spends thousands of crores on watershed development. Two systems already
> hold the data: **SRISHTI** has the satellite layers and the structure
> inventory; **DRISHTI** has lakhs of geo-tagged field photographs. But the
> photographs are *filed, not interpreted*, and the satellite imagery is
> *displayed, not measured*. The result is data without decisions.
>
> **Slide 2 — What we built.**
> Watershed Insight is the analytical layer on top of both. It takes satellite
> pixels and geo-coded photographs and produces **one auditable answer per
> structure**: did it work, how much, how sure are we, and here is the signed PDF
> to prove it.
>
> **Slide 3 — The five modules.**
> Watershed Explorer · Geo-Coded Photo Intelligence · Satellite Change Detection
> · Intervention Impact Analysis · Evidence Generator. All five run end-to-end.
>
> **Slide 4 — The proof.**
> 64 automated tests. 15 of them are *known-answer* tests — we plant a water body
> of known area and require the platform to recover it within 5 %. And we ran the
> whole pipeline on **real Sentinel-2 imagery** over Ralegaon Siddhi: six
> acquisitions, real clouds, real DEM, real terrain.
>
> **Slide 5 — The insight that differentiates us.**
> Two things most dashboards get wrong. First, a working check dam **floods its
> own buffer**, which *lowers* mean NDVI — so we also report land-only NDVI.
> Second, we report **impact and confidence separately**: how much change was
> measured, versus how much that number can be trusted. And we compare every
> structure against 200 random control points in the same watershed, because a
> score of 65 is only meaningful if the background is 28.
>
> **Slide 6 — The ask.**
> One district's real PMKSY-WDC inventory. Everything else is built.

**Timing:** ~40 s per slide leaves 30 s of buffer. Slides 4 and 5 are where to
slow down.

---

## 2 · Where the "AI" actually is

**Say this before you are asked.** Do not let a judge discover the gap.

| What we ship today (deterministic, auditable) | Designed extension (ML) |
| :--- | :--- |
| NDVI / NDWI / NDBI / SAVI spectral indices | Learned LULC segmentation |
| Rule-based LULC decision tree (calibratable) | Supervised classifier trained on reference labels |
| Deterministic computer vision on photographs (ExG, VARI, ExR, Laplacian sharpness) | Fine-tuned photo classifier |
| D8 hydrology, Strahler ordering, catchment delineation | Learned drainage extraction |
| Composite scoring with published weights | Learned impact prediction from labelled outcomes |
| Automated natural-language synthesis of findings | LLM report narrative |

**The line to use:**

> "Our prototype deliberately prioritises **auditable deterministic analytics**
> over a black-box model, because a watershed report has to survive an audit.
> Every number in our PDF can be re-derived from the constants printed on the
> same page. The ML components are designed as **replaceable modules with fixed
> output contracts** — we can swap in a fine-tuned classifier without touching
> the evidence chain."

**The one-word fix:** never say "AI-powered". Say
**"AI-assisted geospatial decision-support"** and then define it as above.

---

## 3 · Judge Q&A — the fifteen questions that will come

### Technical

**Q. Where is the machine learning?**
A. Section 2 above. We chose deterministic methods where they are sufficient and
auditable, and left fixed contracts where ML should replace them. Then pivot to
the evidence chain as the actual contribution.

**Q. Why 250 m? Why not 150 m or 500 m?**
A. Measured, not asserted: `scripts/sensitivity.py`. Spearman ρ between the 250 m
ranking and alternatives is 0.77 (150 m), 0.96 (350 m), 0.96 (500 m) on the
synthetic dataset and 0.99/0.87/0.99 on the real AOI. The top-3 set is stable at
500 m. 250 m is a middle choice and we publish the table.

**Q. Why are the impact weights 40/40/20?**
A. Same script. Plausible reweightings (30/50/20, 50/30/20, 40/30/30) give
ρ ≥ 0.87 on synthetic and ≥ 0.99 on real. It is a presentation convention, not a
determinant. Extreme weightings do reorder — we say so in the docs.

**Q. How do you know your hectares are real hectares?**
A. Per-pixel ground area is computed from latitude (`cos φ`), not assumed
constant, and we test it: a 250 m buffer must enclose πr² ha — it does, within
1 %; a planted water body of known area is recovered within 5 %.

**Q. What happens when it is cloudy?**
A. Two independent mechanisms. Ingestion masks cloud, shadow, cirrus and
saturation via the Sentinel-2 Scene Classification Layer (verified: one scene
came through at 62.7 % observed). Then the **confidence score** drops, because
cloud-free coverage is one of its six factors.

**Q. A check dam floods its own buffer — doesn't that break your NDVI metric?**
A. It would, so we compute **land-only NDVI**: pixels that were water before *or*
after are excluded. We also report the newly inundated area explicitly. This is
the single most common error in naive buffer dashboards.

**Q. Your ranking uses synthetic data. Does it work on real imagery?**
A. Yes for the measurement chain — see `docs/VALIDATION.md`: six real Sentinel-2
acquisitions, real DEM, real clouds, correct recovery of the monsoon cycle
(pre-monsoon NDVI 0.14–0.16, post-monsoon 0.36–0.48). Impact *attribution* is
not yet validated because we have no verified structure inventory; that is our
one ask.

**Q. What did real data break?**
A. Three things, all fixed, all invisible in synthetic data: NaN propagation
through statistics; NDBI mislabelling 65 % of a rural watershed as built-up;
and cloud-masked epochs. Details in §3 of the validation report.

### Scope & integration

**Q. Does this replace SRISHTI / DRISHTI?**
A. No, and it should not. It is the analytical layer on top of both. It reads
their exports and never writes back to the systems of record.

**Q. How would DoLR actually deploy this?**
A. Docker Compose, two containers, no GPU, no paid API. Point `WS_DATA_DIR` at a
nightly SRISHTI mirror and drop DRISHTI exports into the upload endpoint. The
engine is NumPy-only, so it runs on a ₹ 500/month VM.

**Q. What does it cost per watershed?**
A. Marginal cost is essentially zero: public Sentinel-2, no licences, no
inference bill. One ingestion run is ~20 s for a 726 ha AOI at 250×250.

**Q. Who is the user?**
A. Three of them: the **block-level engineer** (which structures to inspect this
month), the **district officer** (which projects to replicate), and the **audit
team** (signed PDF evidence per structure).

### Honesty questions (expect these)

**Q. What is the biggest weakness of your project?**
A. Impact attribution is unvalidated on real data. We have a correct *negative*
result — at DEM-sited candidate locations where nothing was built, the platform
correctly finds no signal distinguishable from background — but we have not yet
demonstrated detection on real, dated structures. That needs one district
inventory. We would rather say that than imply more than we proved.

**Q. Why should we trust the LULC classes?**
A. You should treat them as provisional. We recalibrated the built-up threshold
against real data and found bare soil and built-up are spectrally confusable
with our bands; the docs say so. Validating against BHUVAN/NNRMS reference data
is on the plan.

**Q. What would you do with another three months?**
A. Real inventory validation in two contrasting terrains, ground-truthed LULC,
DRISHTI photo ingestion at scale, and a supervised photo classifier behind the
existing contract.

---

## 4 · Demo script (60 seconds, in order)

1. **Explorer** — `MWS-MH-2025-014`: boundary, 10 structures, 37 photo pins, NDVI raster, 6 epochs.
2. **Change** — ΔNDVI +0.047, 29 % of the area improving, gainer/loser hotspots.
3. **Photos** — open a photograph: EXIF GPS, "23.6 m from structure", automated
   read *"water impoundment visible — 15.9 % water"*, satellite cross-check **AGREE**.
4. **Impact** — *Percolation Tank #003*: **impact 65/100**, **confidence 100/100**,
   **p97 vs control**, land-only ΔNDVI +0.072, **net of background +0.025**, catchment.
5. **Evidence** — *Generate PDF*: 4-page pack, including the confidence
   decomposition and the background comparison.
6. **Close** — "Now the same pipeline on real Sentinel-2": restart with
   `WS_DATA_DIR=data/real`.

---

## 5 · Validation plan (post-hackathon, in priority order)

| # | Task | Unlocks | Effort |
| ---: | :--- | :--- | :--- |
| 1 | Obtain one district PMKSY-WDC inventory (type, GPS, commissioning date) | **Impact attribution (T4)** — the single biggest gap | 1 data request |
| 2 | Ingest a real DRISHTI photo export | Validates the photo half of the chain on real field images | 1 day |
| 3 | Compare LULC against BHUVAN/NNRMS for the AOI | Confusion matrix for the classifier | 2 days |
| 4 | Repeat ingestion for 2–3 contrasting AOIs | Threshold transferability | 2 days |
| 5 | Validate water extent against a surveyed tank polygon | Small-water-body detection limit | 1 day |
| 6 | Replace the photo interpreter with a fine-tuned classifier | The ML extension, behind the existing contract | 1 week |

---

## 6 · Repository-history note

The evaluation repository was consolidated from private development, so its
history does not reflect the order in which the work was done. If asked:

> "We developed privately and published a consolidated repository for
> evaluation; from here on the history records the work directly."

The honest fix is the one already applied for the current work: commit in
**logical layers** (engine → API → frontend → data → tests → docs) rather than
as one large change. Do not fabricate backdated commits — a reviewer who
compares timestamps with the sandbox or CI will find it, and the downside is far
worse than the upside.
