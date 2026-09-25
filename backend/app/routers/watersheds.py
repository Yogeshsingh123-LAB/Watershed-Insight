"""
watersheds.py - Module 1 (Watershed Explorer) REST endpoints.
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from ..config import settings
from ..services.store import WatershedNotFound, get_store

router = APIRouter(prefix="/watersheds", tags=["Watersheds"])

VALID_OVERLAYS = {"ndvi", "ndwi", "ndbi", "savi", "delta", "lulc",
                  "hillshade", "slope", "twi"}


@router.get("")
def list_watersheds(state: Optional[str] = Query(None, description="Filter by state name/code"),
                    district: Optional[str] = Query(None),
                    block: Optional[str] = Query(None)):
    """Every micro-watershed in the catalog, with headline indicators."""
    store = get_store()
    items = store.list_watersheds()
    if state:
        items = [i for i in items if state.lower() in (i.get("state", "") + i.get("state_code", "")).lower()]
    if district:
        items = [i for i in items if district.lower() in i.get("district", "").lower()]
    if block:
        items = [i for i in items if block.lower() in i.get("block", "").lower()]
    return {"count": len(items), "watersheds": items}


@router.get("/catalog")
def get_catalog():
    """State -> District -> Block -> Micro-watershed hierarchy for the selector."""
    return get_store().catalog


@router.get("/{watershed_id}")
def get_watershed(watershed_id: str):
    """Boundary + metadata + headline indicators for one micro-watershed."""
    store = get_store()
    try:
        meta = store.watershed_meta(watershed_id)
        proc = store.processor(watershed_id)
    except WatershedNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return {
        **meta,
        "boundary": store.boundary(watershed_id),
        "stats": store.watershed_stats(watershed_id),
        "epochs": [e.to_dict() for e in proc.epochs],
        "overlay_bounds": proc.grid.leaflet_bounds(),
        "bbox": proc.bounds(),
    }


@router.get("/{watershed_id}/summary")
def get_summary(watershed_id: str):
    """Complete dashboard payload (one round-trip for the front-end)."""
    store = get_store()
    try:
        return store.watershed_summary(watershed_id)
    except (WatershedNotFound, FileNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{watershed_id}/stats")
def get_stats(watershed_id: str):
    store = get_store()
    try:
        return store.watershed_stats(watershed_id)
    except (WatershedNotFound, FileNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{watershed_id}/timeseries")
def get_timeseries(watershed_id: str,
                   lat: Optional[float] = Query(None, ge=-90, le=90),
                   lon: Optional[float] = Query(None, ge=-180, le=180),
                   radius_m: float = Query(250, ge=25, le=settings.max_buffer_m)):
    """Multi-epoch NDVI / NDWI / water-area profile (watershed or buffer)."""
    store = get_store()
    try:
        return {"watershed_id": watershed_id,
                "series": store.timeseries(watershed_id, lat, lon, radius_m)}
    except (WatershedNotFound, FileNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{watershed_id}/lulc")
def get_lulc(watershed_id: str,
             lat: Optional[float] = Query(None, ge=-90, le=90),
             lon: Optional[float] = Query(None, ge=-180, le=180),
             radius_m: Optional[float] = Query(None, ge=25, le=settings.max_buffer_m)):
    """LULC composition at T0/T1 plus the transition matrix."""
    store = get_store()
    try:
        return store.lulc_summary(watershed_id, lat, lon, radius_m)
    except (WatershedNotFound, FileNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{watershed_id}/drainage")
def get_drainage(watershed_id: str,
                 pour_lat: Optional[float] = Query(None, ge=-90, le=90),
                 pour_lon: Optional[float] = Query(None, ge=-180, le=180),
                 max_features: int = Query(400, ge=10, le=2000)):
    """
    Drainage network (GeoJSON LineStrings with Strahler order) + morphometry.
    Pass ``pour_lat`` / ``pour_lon`` to also delineate the upstream catchment.
    """
    store = get_store()
    try:
        return store.drainage(watershed_id, pour_lat, pour_lon, max_features)
    except (WatershedNotFound, FileNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{watershed_id}/terrain")
def get_terrain(watershed_id: str):
    """DEM derivatives: slope classes, TWI, elevation distribution."""
    store = get_store()
    try:
        return store.terrain_summary(watershed_id)
    except (WatershedNotFound, FileNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{watershed_id}/overlays")
def list_overlays(watershed_id: str, epoch: Optional[str] = None,
                  alpha: float = Query(0.8, ge=0.1, le=1.0)):
    """URLs of every renderable Web-GIS overlay for this watershed."""
    store = get_store()
    try:
        store.processor(watershed_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return {
        "watershed_id": watershed_id,
        "bounds": store.overlay_bounds(watershed_id),
        "overlays": {
            name: store.overlay_path(watershed_id, name, epoch, alpha)
            for name in sorted(VALID_OVERLAYS)
        },
    }


@router.get("/{watershed_id}/overlays/{name}")
def get_overlay(watershed_id: str, name: str, epoch: Optional[str] = None,
                alpha: float = Query(0.8, ge=0.1, le=1.0)):
    """
    Render (and cache) a single transparent map overlay.

    ``name`` is one of: ndvi, ndwi, ndbi, savi, delta, lulc, hillshade, slope, twi
    """
    if name not in VALID_OVERLAYS:
        raise HTTPException(status_code=400,
                            detail=f"Unknown overlay '{name}'. Valid: {sorted(VALID_OVERLAYS)}")
    store = get_store()
    try:
        url = store.overlay_path(watershed_id, name, epoch, alpha)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return {"watershed_id": watershed_id, "layer": name, "epoch": epoch,
            "bounds": store.overlay_bounds(watershed_id), "url": url}


@router.get("/{watershed_id}/environment")
def get_environment(watershed_id: str):
    """Environmental context: season matching, rainfall status, cloud cover."""
    store = get_store()
    try:
        return store.watershed_environment(watershed_id)
    except WatershedNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{watershed_id}/decision-summary")
def get_decision_summary(watershed_id: str):
    """Decision Center summary payload with Action Queue for officers."""
    store = get_store()
    try:
        return store.watershed_decision_summary(watershed_id)
    except WatershedNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))

