"""
photos.py - Module 2 (Geo-Coded Photo Intelligence).

Upload, EXIF extraction, spatial binding, evidence validation and automated
content interpretation of DRISHTI field photographs.
"""

from __future__ import annotations

import os
import shutil
import tempfile
import uuid
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from ..config import settings
from ..services.store import PhotoNotFound, WatershedNotFound, get_store

router = APIRouter(prefix="/photos", tags=["Geo-Coded Photos"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg"}
MAX_BYTES = settings.max_upload_mb * 1024 * 1024


@router.get("")
def list_photos(watershed_id: Optional[str] = None,
                intervention_id: Optional[str] = None,
                quality: Optional[str] = Query(None, pattern="^(verified|acceptable|questionable)$"),
                has_gps: Optional[bool] = None):
    """Geo-coded photographs with EXIF metadata, binding and validation flags."""
    store = get_store()
    items = store.photos_for(watershed_id, intervention_id, quality, has_gps)
    return {"count": len(items), "photos": [p.to_dict() for p in items]}


@router.get("/stats")
def photo_stats(watershed_id: Optional[str] = None):
    """Evidence-quality dashboard for the photo stream."""
    return get_store().photo_stats(watershed_id)


@router.get("/geojson")
def photos_geojson(watershed_id: Optional[str] = None):
    """Photo locations as a GeoJSON FeatureCollection for the map layer."""
    return get_store().photos_geojson(watershed_id)


@router.get("/{photo_id}")
def get_photo(photo_id: str):
    store = get_store()
    try:
        photo = store.photo(photo_id)
    except PhotoNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return {**photo.to_dict(), "interpretation": store.photo_interpretation(photo_id)}


@router.get("/{photo_id}/interpretation")
def interpret(photo_id: str):
    """
    Automated content interpretation: vegetation / water / soil / sky fractions,
    greenness index, sharpness, dominant palette and a plain-language label.
    """
    store = get_store()
    try:
        return store.photo_interpretation(photo_id)
    except PhotoNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/upload")
async def upload_photos(
    files: List[UploadFile] = File(..., description="Geo-tagged JPEG photographs"),
    watershed_id: Optional[str] = Form(None),
    intervention_id: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None, description="Manual GPS override (decimal degrees)"),
    longitude: Optional[float] = Form(None, description="Manual GPS override (decimal degrees)"),
):
    """
    Ingest DRISHTI-style geo-tagged photographs.

    Each file is stored, its EXIF is parsed, the photo is bound to the nearest
    intervention and validated.  Photographs whose EXIF GPS is missing can be
    positioned manually with the ``latitude`` / ``longitude`` form fields.
    """
    store = get_store()
    results, errors = [], []

    for upload in files:
        ext = os.path.splitext(upload.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            errors.append({"file": upload.filename, "error": "Only JPEG files are supported."})
            continue

        tmp_dir = tempfile.mkdtemp(prefix="ws-upload-")
        tmp_path = os.path.join(tmp_dir, f"{uuid.uuid4().hex}{ext}")
        try:
            size = 0
            with open(tmp_path, "wb") as fh:
                while chunk := await upload.read(1024 * 64):
                    size += len(chunk)
                    if size > MAX_BYTES:
                        raise ValueError(f"File exceeds the {settings.max_upload_mb} MB limit.")
                    fh.write(chunk)
            await upload.close()

            safe_name = f"{uuid.uuid4().hex[:8]}_{os.path.basename(upload.filename or 'photo.jpg')}"
            photo = store.add_photo(tmp_path, safe_name, watershed_id,
                                    intervention_id, latitude, longitude)
            results.append(photo.to_dict())
        except ValueError as exc:
            errors.append({"file": upload.filename, "error": str(exc)})
        except Exception as exc:  # pragma: no cover - defensive
            errors.append({"file": upload.filename, "error": f"Ingestion failed: {exc}"})
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    if not results and errors:
        raise HTTPException(status_code=400, detail=errors)
    return {
        "uploaded": len(results),
        "photos": results,
        "errors": errors,
        "stats": store.photo_stats(watershed_id) if watershed_id else None,
    }


@router.post("/revalidate")
def revalidate(watershed_id: Optional[str] = None):
    """Re-run EXIF extraction, binding and validation over the whole archive."""
    store = get_store()
    store.build_photo_index(force=True)
    return {"status": "ok", "photos": len(store.photos),
            "stats": store.photo_stats(watershed_id)}
