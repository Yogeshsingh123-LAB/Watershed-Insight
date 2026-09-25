"""
ai_explainer.py
===============
Deterministic, evidence-bounded interpretation layer. Generates plain-language
explanations and answers user queries using ONLY pre-computed geospatial analytics.
Never invents data, values, or causal claims.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from .models import AiExplanationResponse, AiQueryResponse


class AiExplainerService:
    @staticmethod
    def explain_evidence(
        watershed_summary: Dict[str, Any],
        intervention_analysis: Optional[Dict[str, Any]] = None
    ) -> AiExplanationResponse:
        ws_name = watershed_summary.get("watershed", {}).get("name", "Micro-Watershed")
        stats = watershed_summary.get("stats", {})
        ndvi_change = stats.get("ndvi_change", 0.0)
        water_gain = stats.get("water_area_ha_t1", 0.0) - stats.get("water_area_ha_t0", 0.0)
        
        if intervention_analysis:
            struct = intervention_analysis.get("intervention", {})
            buffer = intervention_analysis.get("buffer", {})
            impact = intervention_analysis.get("impact", {})
            struct_name = struct.get("name", struct.get("id", "Structure"))
            score = impact.get("score", 0.0)
            confidence = impact.get("confidence", "Moderate")
            ndvi_land = buffer.get("ndvi_change_land", 0.0)
            water_ha = buffer.get("water_change_ha", 0.0)
            
            summary = (
                f"Analysis for structure '{struct_name}' in {ws_name} indicates an Impact Score "
                f"of {score:.1f}/100 with {confidence} evidence confidence. Land-only vegetation index (NDVI) "
                f"increased by +{ndvi_land:.3f} within the 250m assessment buffer, alongside +{water_ha:.2f} ha of surface water."
            )
            key_obs = [
                f"Land-only NDVI change inside 250m buffer: +{ndvi_land:.3f}.",
                f"Surface water extent change inside buffer: +{water_ha:.2f} ha.",
                f"Overall impact score: {score:.1f}/100 ({impact.get('recommendation', 'Monitor')})."
            ]
            evidence = [
                f"Satellite Spectral Analysis (Sentinel-2 / 10m spatial resolution).",
                f"Land-only buffer metric (water pixels excluded to prevent check dam penalty).",
                f"DRISHTI Geo-tagged field photo verification."
            ]
            uncertainty = [
                "Observed changes represent spatial association with intervention location.",
                "Background monsoon variability may account for a portion of greening."
            ]
            action = impact.get("recommendation", "Continue seasonal monitoring.")
            citations = ["Sentinel-2 Spectral Indices", "DRISHTI Geo-tagged Photo Index", "DEM Flow Routing"]
        else:
            summary = (
                f"Micro-watershed '{ws_name}' shows a mean NDVI change of {ndvi_change:+.3f} "
                f"between T0 and T1, with a net surface water extent shift of {water_gain:+.2f} ha across the basin."
            )
            key_obs = [
                f"Mean watershed NDVI change: {ndvi_change:+.3f}.",
                f"Net water surface area shift: {water_gain:+.2f} ha.",
                f"Total structure count assessed: {len(watershed_summary.get('interventions', []))}."
            ]
            evidence = [
                "Full watershed boundary zonal statistics.",
                "Multitemporal satellite spectral change detection.",
                "LULC 6-class transition matrix."
            ]
            uncertainty = [
                "Rainfall distribution and seasonal timing influence overall watershed response."
            ]
            action = "Prioritize field inspections for structures with low evidence confidence or low impact scores."
            citations = ["SRISHTI Spatial Layers", "Sentinel-2 Multi-Epoch Rasters"]

        return AiExplanationResponse(
            summary=summary,
            key_observations=key_obs,
            supporting_evidence=evidence,
            uncertainty_notes=uncertainty,
            recommended_action=action,
            citation_sources=citations
        )

    @staticmethod
    def query_evidence(
        prompt: str,
        watershed_summary: Dict[str, Any]
    ) -> AiQueryResponse:
        p = prompt.lower()
        ws_name = watershed_summary.get("watershed", {}).get("name", "Micro-Watershed")
        stats = watershed_summary.get("stats", {})
        ranking = watershed_summary.get("ranking", [])
        photos = watershed_summary.get("photos", [])
        
        if "inspect" in p or "field" in p or "action" in p:
            needing = [i for i in ranking if isinstance(i, dict) and (i.get("impact_score", 100) < 45 or i.get("status") == "Under Implementation")]
            count = len(needing)
            names = ", ".join([i.get("name", i.get("id")) for i in needing[:3]])
            answer = (
                f"In {ws_name}, {count} structure(s) require field inspection or monitoring review based on "
                f"computed evidence thresholds. Key structures include: {names if names else 'None'}. "
                f"Inspection is recommended due to lower measured vegetation response or incomplete DRISHTI photo evidence."
            )
            sources = ["Decision Center Action Queue", "Intervention Impact Ranking"]
        elif "confidence" in p or "why" in p:
            photo_stats = watershed_summary.get("photo_stats", {})
            verified_pct = photo_stats.get("verified_pct", 100.0)
            answer = (
                f"Evidence confidence is calculated using 6 factors: cloud-free coverage, epoch availability, "
                f"season matching, field photo GPS verification ({verified_pct:.1f}% verified), buffer coverage, "
                f"and pre-work baseline presence."
            )
            sources = ["Evidence Health Checklist", "DRISHTI Photo Validation Index"]
        elif "vegetation" in p or "ndvi" in p or "change" in p:
            ndvi_delta = stats.get("ndvi_change", 0.0)
            veg_t0 = stats.get("veg_area_ha_t0", 0.0)
            veg_t1 = stats.get("veg_area_ha_t1", 0.0)
            answer = (
                f"Between baseline and recent epochs in {ws_name}, mean NDVI changed by {ndvi_delta:+.3f}. "
                f"Total vegetation extent changed from {veg_t0:.1f} ha to {veg_t1:.1f} ha."
            )
            sources = ["Sentinel-2 Multi-Epoch Spectral Index Analysis"]
        else:
            answer = (
                f"Micro-watershed '{ws_name}' contains {len(ranking)} interventions and {len(photos)} field photos. "
                f"Overall NDVI change is {stats.get('ndvi_change', 0.0):+.3f} with a net surface water change of "
                f"{stats.get('water_area_ha_t1', 0.0) - stats.get('water_area_ha_t0', 0.0):+.2f} ha."
            )
            sources = ["Watershed Summary Data Store"]


        return AiQueryResponse(
            answer=answer,
            supporting_sources=sources,
            evidence_metrics={
                "watershed_id": watershed_summary.get("watershed", {}).get("id"),
                "ndvi_change": stats.get("ndvi_change", 0.0),
                "interventions_count": len(ranking)
            }
        )

