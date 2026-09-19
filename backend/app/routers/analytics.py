"""
analytics.py - Module 3 (Satellite Change Detection) endpoints.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from ..config import settings
from ..services.store import WatershedNotFound, get_store

router = APIRouter(prefix="/analytics", tags=["Analytics"])

VALID_INDICES = {"ndvi", "ndwi", "ndbi", "savi"}


@router.get("/{watershed_id}/change-detection")
def change_detection(watershed_id: str,
                     index: str = Query("ndvi", pattern="^(ndvi|ndwi|ndbi|savi)$"),
                     epoch_a: Optional[str] = None,
                     epoch_b: Optional[str] = None):
    """
    Pixel-wise change statistics between two epochs for one spectral index,
    including the area in each change class (large decline -> large gain).
    """
    store = get_store()
    try:
        return {
            "watershed_id": watershed_id,
            **store.change_detection(watershed_id, index, epoch_a, epoch_b),
        }
    except (WatershedNotFound, FileNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{watershed_id}/hotspots")
def hotspots(watershed_id: str,
             index: str = Query("ndvi", pattern="^(ndvi|ndwi|ndbi|savi)$"),
             top_n: int = Query(5, ge=1, le=25)):
    """
    Block-aggregated change hotspots: where to send a field team first, and
    where the watershed is losing ground.
    """
    store = get_store()
    try:
        return {"watershed_id": watershed_id, "index": index,
                **store.hotspots(watershed_id, index, top_n)}
    except (WatershedNotFound, FileNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{watershed_id}/compare")
def compare_epochs(watershed_id: str,
                   epoch_a: Optional[str] = None,
                   epoch_b: Optional[str] = None):
    """Side-by-side comparison of every indicator for two arbitrary epochs."""
    store = get_store()
    try:
        proc = store.processor(watershed_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    key_a = epoch_a or proc.t0_key
    key_b = epoch_b or proc.t1_key
    out = {"watershed_id": watershed_id, "epoch_a": key_a, "epoch_b": key_b, "indices": {}}
    for name in sorted(VALID_INDICES):
        result = proc.change_detection(name, key_a, key_b)
        result.pop("delta", None)
        out["indices"][name] = result
    return out


@router.get("/{watershed_id}/epochs")
def list_epochs(watershed_id: str):
    """Available satellite acquisitions for the watershed."""
    store = get_store()
    try:
        proc = store.processor(watershed_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return {"watershed_id": watershed_id, "epochs": [e.to_dict() for e in proc.epochs]}
