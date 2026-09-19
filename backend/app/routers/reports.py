"""
reports.py - Module 5 (Evidence Generator) endpoints.
"""

from __future__ import annotations

import os
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from reports.pdf_generator import generate_intervention_pdf, generate_watershed_pdf

from ..config import settings
from ..services.store import InterventionNotFound, WatershedNotFound, get_store

router = APIRouter(prefix="/reports", tags=["Reports"])


def _safe_name(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "-_." else "_" for ch in value)


@router.get("")
def list_reports():
    """Previously generated PDF documents available for download."""
    directory = settings.reports_dir
    items = []
    if os.path.isdir(directory):
        for name in sorted(os.listdir(directory), reverse=True):
            path = os.path.join(directory, name)
            if name.lower().endswith(".pdf"):
                items.append({
                    "filename": name,
                    "url": f"/api/v1/reports/{name}",
                    "size_kb": round(os.path.getsize(path) / 1024.0, 1),
                    "modified": int(os.path.getmtime(path)),
                })
    return {"count": len(items), "reports": items}


@router.get("/{filename}")
def download_report(filename: str):
    path = os.path.join(settings.reports_dir, os.path.basename(filename))
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Report not found.")
    return FileResponse(path, media_type="application/pdf", filename=filename)


@router.post("/intervention/{intervention_id}")
def report_intervention(intervention_id: str,
                        radius_m: float = Query(250.0, ge=25, le=settings.max_buffer_m)):
    """Generate (or regenerate) the PDF evidence pack for one structure."""
    store = get_store()
    try:
        item = store.intervention(intervention_id)
    except InterventionNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    filename = f"EvidencePack_{_safe_name(intervention_id)}_{int(radius_m)}m.pdf"
    path = os.path.join(settings.reports_dir, filename)
    try:
        generate_intervention_pdf(store, intervention_id, path, radius_m)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {exc}")

    return FileResponse(path, media_type="application/pdf", filename=filename,
                        headers={"X-Watershed-Insight": f"intervention={intervention_id}"})


@router.post("/watershed/{watershed_id}")
def report_watershed(watershed_id: str,
                     radius_m: float = Query(250.0, ge=25, le=settings.max_buffer_m)):
    """Generate the full micro-watershed assessment PDF."""
    store = get_store()
    try:
        meta = store.watershed_meta(watershed_id)
    except WatershedNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    filename = f"WatershedAssessment_{_safe_name(meta.get('code', watershed_id))}.pdf"
    path = os.path.join(settings.reports_dir, filename)
    try:
        generate_watershed_pdf(store, watershed_id, path, radius_m)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {exc}")

    return FileResponse(path, media_type="application/pdf", filename=filename,
                        headers={"X-Watershed-Insight": f"watershed={watershed_id}"})
