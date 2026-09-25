# SIH 2026 — Final Project Report (PS26015)

## Watershed Insight: A Geospatial Decision-Support & Evidence Intelligence Platform

**Problem Statement:** PS26015 — Application of Geospatial Techniques for visualization and analysis to interpret Geo-Coded Images to enhance watershed Development Outcomes.  
**Organization:** Department of Land Resources (DoLR), Ministry of Rural Development, Government of India.  
**Category:** Software | **Theme:** Agriculture, FoodTech & Rural Development.

---

## 1. Problem & Innovation Summary

### Problem
The Department of Land Resources spends thousands of crores under PMKSY-WDC (IWMP) on micro-watershed development. Two key systems exist:
- **SRISHTI**: Web-GIS portal holding spatial layers, watershed boundaries, and structure inventories.
- **DRISHTI**: Mobile app capturing lakhs of geo-tagged field photographs during structure execution.

However, field photographs are currently stored as uninterpreted image archives, while satellite data is predominantly displayed rather than quantitatively measured. Government decision-makers lack an integrated, auditable evidence layer that connects satellite change detection with field photographs to justify expenditure and guide field inspections.

### Solution & Innovation
**Watershed Insight** bridges SRISHTI satellite stacks and DRISHTI geo-coded field evidence to create an auditable **Geospatial Decision-Support Platform**.

Key Innovations:
1. **Inundation-Aware Vegetation Indexing**: Separates land-only NDVI from water pixels so working check dams and tanks flooding their own buffers are not falsely penalised.
2. **Deterministic & Auditable Core**: 100% of figures, scores, and metrics in generated reports are derived from published formulas and transparent weights (40% vegetation, 40% water, 20% spatial extent).
3. **Background Control Difference-in-Differences**: Samples 200 random control points inside the watershed to distinguish local intervention impact from landscape-wide monsoon greening.
4. **Independent Impact & Confidence Metrics**: Impact (measured physical change) is strictly separated from Confidence (6-factor data quality & evidence completeness score).
5. **Government Officer Decision Center**: Replaces generic AI dashboards with an official GoI decision-support workflow including Action Queues, Field Inspection tasking, and Audit Trails.

---

## 2. Technical Architecture & Integration

```
SRISHTI Stack (Vector/GIS) + DRISHTI Stack (Geo-Photos) + Sentinel-2 (VNIR/SWIR) + DEM (SRTM)
                                    ↓
                         DATA INGESTION & ADAPTERS
                                    ↓
                     NUMPY GEOSPATIAL & HYDROLOGY ENGINE
                      (D8, Flow Acc, Strahler, LULC, Indices)
                                    ↓
                           EVIDENCE FUSION LAYER
                    (Buffer Net Delta + EXIF Cross-Check)
                                    ↓
                     IMPACT & CONFIDENCE DECOMPOSITION
               (40/40/20 Impact + 6-Factor Evidence Health)
                                    ↓
                        GOVERNMENT DECISION CENTER
                (Action Queue + Field Inspection Tasking)
                                    ↓
                      ROLE GOVERNANCE & AUDIT TRAIL
                 (RBAC + Immutable Operation Logging)
                                    ↓
                    10-PAGE AUDIT EVIDENCE PDF REPORT
```

---

## 3. Evidence Intelligence & Scientific Honesty

- **Observation vs. Interpretation vs. Recommendation**: Every analytical output explicitly segregates raw satellite observations from domain interpretations and recommended officer actions.
- **No False Causality Claims**: The platform uses scientifically honest terminology ("spatial association", "evidence consistent with") rather than claiming absolute causation without multi-year ground truth.
- **Evidence-Bounded AI Explanation Layer**: AI interpretation operates strictly as an explanation interface over computed statistics, with zero hallucination of values or metrics.

---

## 4. Operational Deployment Model

- **Infrastructure**: Lightweight Docker Compose architecture (FastAPI backend + Vite React frontend). Runs without GPU dependencies or paid API keys.
- **Data Integration**: Standardized on-disk data contracts for SRISHTI GeoJSON/NPZ and DRISHTI EXIF/CSV exports.
- **Offline / Field Readiness**: 100% functional without active internet connection using bundled verified demonstration datasets.
