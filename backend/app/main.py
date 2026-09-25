"""
main.py - Watershed Insight FastAPI application (SIH PS26015).

An analytical layer on top of the SRISHTI (satellite / Web-GIS) and DRISHTI
(geo-tagged field photograph) stacks of the Department of Land Resources:

    DATA -> INFORMATION -> ANALYSIS -> INTERPRETATION -> DECISION SUPPORT

Run locally:
    python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
"""

from __future__ import annotations

import os
import platform
import sys
import time
from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from .config import settings  # noqa: E402
from .routers import analytics, interventions, photos, reports, watersheds, data_sources, field_inspections, audit, ai, auth  # noqa: E402
from .services.store import WatershedNotFound, get_store  # noqa: E402

APP_START = time.time()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Warm the caches on startup so the first dashboard request is instant."""
    try:
        store = get_store()
        store.build_photo_index()
        if store.list_watersheds():
            store.watershed_stats(store.list_watersheds()[0]["id"])
    except Exception as exc:  # pragma: no cover - startup diagnostics
        print(f"[startup] warm-up skipped: {exc}")
    yield


app = FastAPI(
    title=settings.project_name,
    version=settings.version,
    description=(
        "Geospatial decision-support API for micro-watershed monitoring and impact "
        "assessment. Aligns SRISHTI satellite layers with DRISHTI geo-coded field "
        "photographs to produce spatially validated, audit-ready evidence.\n\n"
        "Built for Smart India Hackathon 2026 - Problem Statement PS26015 "
        "(Ministry of Rural Development / Department of Land Resources)."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------- #
# Static assets (photos, satellite previews, generated overlays & reports)
# --------------------------------------------------------------------------- #
def _mount_if_exists(route: str, directory: str, name: str) -> None:
    os.makedirs(directory, exist_ok=True)
    app.mount(route, StaticFiles(directory=directory), name=name)


_mount_if_exists("/static/photos", settings.photos_dir, "photos")
_mount_if_exists("/static/satellite", os.path.join(settings.data_dir, "satellite"), "satellite")
_mount_if_exists("/static/overlays", settings.output_dir, "overlays")
_mount_if_exists("/static/reports", settings.reports_dir, "reports")


# --------------------------------------------------------------------------- #
# Routers
# --------------------------------------------------------------------------- #
app.include_router(watersheds.router, prefix=settings.api_prefix)
app.include_router(interventions.router, prefix=settings.api_prefix)
app.include_router(photos.router, prefix=settings.api_prefix)
app.include_router(analytics.router, prefix=settings.api_prefix)
app.include_router(reports.router, prefix=settings.api_prefix)
app.include_router(data_sources.router, prefix=settings.api_prefix)
app.include_router(field_inspections.router, prefix=settings.api_prefix)
app.include_router(audit.router, prefix=settings.api_prefix)
app.include_router(ai.router, prefix=settings.api_prefix)
app.include_router(auth.router, prefix=settings.api_prefix)



# --------------------------------------------------------------------------- #
# Health / meta
# --------------------------------------------------------------------------- #
@app.get("/", tags=["Meta"])
def root() -> Dict[str, Any]:
    return {
        "platform": "Watershed Insight",
        "problem_statement": "SIH PS26015",
        "organisation": "Ministry of Rural Development / Department of Land Resources",
        "version": settings.version,
        "docs": "/docs",
        "health": "/api/v1/health",
    }


@app.get(f"{settings.api_prefix}/health/db", tags=["Meta"])
def db_health() -> Dict[str, Any]:
    from .database import test_db_connection
    return {
        "status": "online",
        "database": test_db_connection(),
        "database_url_configured": bool(settings.database_url),
        "use_db_store": settings.use_db_store,
    }


@app.get(f"{settings.api_prefix}/health", tags=["Meta"])
def health() -> Dict[str, Any]:
    store = get_store()
    try:
        watersheds_meta = store.list_watersheds()
        dataset_ok = bool(watersheds_meta)
        detail = {"watersheds": len(watersheds_meta)}
    except Exception as exc:  # pragma: no cover - startup diagnostics
        dataset_ok, detail = False, {"error": str(exc)}

    return {
        "status": "online" if dataset_ok else "degraded",
        "uptime_s": round(time.time() - APP_START, 1),
        "python": platform.python_version(),
        "data_dir": settings.data_dir,
        "default_buffer_m": settings.default_buffer_m,
        **detail,
        "hint": "Run `python scripts/generate_sample_data.py` if the dataset is missing.",
    }


@app.exception_handler(WatershedNotFound)
async def watershed_not_found(request: Request, exc: WatershedNotFound):
    return JSONResponse(status_code=404, content={"detail": str(exc)})


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=settings.debug)
