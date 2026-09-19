"""
interventions.py - Modules 3 & 4 (buffer impact analysis and prioritisation).
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from ..config import settings
from ..services.store import InterventionNotFound, WatershedNotFound, get_store

router = APIRouter(prefix="/interventions", tags=["Interventions"])


@router.get("")
def list_interventions(watershed_id: Optional[str] = None,
                       type: Optional[List[str]] = Query(None, description="Filter by structure type"),
                       status: Optional[str] = None):
    """IWMP structures as a GeoJSON FeatureCollection (map-ready)."""
    store = get_store()
    try:
        if watershed_id:
            store.watershed_meta(watershed_id)
        return store.interventions_geojson(watershed_id, type)
    except WatershedNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/ranking")
def get_ranking(watershed_id: str,
                radius_m: float = Query(settings.default_buffer_m, ge=25,
                                        le=settings.max_buffer_m)):
    """
    Interventions ranked by composite impact score - the prioritisation list a
    district officer works from (what to replicate, what to inspect).
    """
    store = get_store()
    try:
        rows = store.ranking(watershed_id, radius_m)
    except (WatershedNotFound, FileNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return {
        "watershed_id": watershed_id,
        "radius_m": radius_m,
        "count": len(rows),
        "ranking": rows,
    }


@router.get("/{intervention_id}")
def get_intervention(intervention_id: str):
    store = get_store()
    try:
        return store.intervention(intervention_id)
    except InterventionNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{intervention_id}/analysis")
def analyse_intervention(intervention_id: str,
                         radius_m: float = Query(settings.default_buffer_m,
                                                 ge=settings.min_buffer_m,
                                                 le=settings.max_buffer_m),
                         epoch_a: Optional[str] = None,
                         epoch_b: Optional[str] = None):
    """
    Complete evidence bundle for one structure:

    * 250 m buffer satellite statistics (NDVI / NDWI / water & vegetation area),
    * inundation-aware vegetation response,
    * LULC transition inside the buffer,
    * bound geo-coded photographs with content interpretation,
    * satellite-vs-photo cross-validation.
    """
    store = get_store()
    try:
        return store.intervention_analysis(intervention_id, radius_m, epoch_a, epoch_b)
    except InterventionNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{intervention_id}/timeseries")
def intervention_timeseries(intervention_id: str,
                            radius_m: float = Query(settings.default_buffer_m,
                                                    ge=settings.min_buffer_m,
                                                    le=settings.max_buffer_m)):
    """Seasonal response curve inside the structure's buffer."""
    store = get_store()
    try:
        item = store.intervention(intervention_id)
        proc = store.processor(item["watershed_id"])
        return {
            "intervention": {"id": item["id"], "name": item["name"], "type": item["type"]},
            "radius_m": radius_m,
            "series": proc.time_series(item["latitude"], item["longitude"], radius_m),
        }
    except InterventionNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{intervention_id}/catchment")
def intervention_catchment(intervention_id: str):
    """
    Delineate the upstream contributing area of the structure from the DEM -
    the hydrological justification for its location and size.
    """
    store = get_store()
    try:
        item = store.intervention(intervention_id)
        return {
            "intervention": {"id": item["id"], "name": item["name"], "type": item["type"]},
            **store.drainage(item["watershed_id"], item["latitude"], item["longitude"]),
        }
    except InterventionNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))
