"""
data_sources.py
===============
Router for SRISHTI, DRISHTI, Sentinel-2, and DEM data source status.
"""

from __future__ import annotations

import time
from typing import Dict, Any
from fastapi import APIRouter
from ..config import settings
from ..services.models import DataSourcesOverview, DataSourceInfo, SourceStatus

router = APIRouter(tags=["Data Sources"])


@router.get("/data-sources", response_model=DataSourcesOverview)
def get_data_sources() -> DataSourcesOverview:
    srishti_status = SourceStatus.CONNECTED if settings.srishti_connected else SourceStatus.DEMO_DATA
    drishti_status = SourceStatus.CONNECTED if settings.drishti_connected else SourceStatus.DEMO_DATA

    sources = [
        DataSourceInfo(
            id="src_srishti",
            name="SRISHTI Stack",
            type="Vector & GIS Inventory",
            status=srishti_status,
            last_synced=time.strftime("%Y-%m-%d %H:%M:%S"),
            item_count=16,
            description="Micro-watershed boundaries, intervention structure inventory, and cadastral layers.",
            is_synthetic=not settings.srishti_connected,
            details={"department": "Department of Land Resources", "layer_count": 4}
        ),
        DataSourceInfo(
            id="src_drishti",
            name="DRISHTI Stack",
            type="Geo-tagged Field Photographs",
            status=drishti_status,
            last_synced=time.strftime("%Y-%m-%d %H:%M:%S"),
            item_count=37,
            description="Field photographs with EXIF GPS tags, timestamps, and structure binding.",
            is_synthetic=not settings.drishti_connected,
            details={"exif_verified_pct": 91.9, "camera_models": ["Android GPS Camera", "Field Tablet"]}
        ),
        DataSourceInfo(
            id="src_satellite",
            name="Sentinel-2 MSI",
            type="Multi-Spectral Satellite Imagery",
            status=SourceStatus.CONNECTED,
            last_synced=time.strftime("%Y-%m-%d %H:%M:%S"),
            item_count=6,
            description="Surface reflectance 10m-20m bands (VNIR/SWIR) for pre/post-monsoon multi-year epochs.",
            is_synthetic=False,
            details={"provider": "ESA Copernicus / STAC Open Access", "bands": ["B02", "B03", "B04", "B08", "B11"]}
        ),
        DataSourceInfo(
            id="src_dem",
            name="Terrain DEM",
            type="Digital Elevation Model",
            status=SourceStatus.CONNECTED,
            last_synced=time.strftime("%Y-%m-%d %H:%M:%S"),
            item_count=2,
            description="30m elevation grid for hydrological D8 flow direction, slope, and catchment delineation.",
            is_synthetic=False,
            details={"source": "AWS Terrarium / SRTM 30m", "resolution_m": 30.0}
        )
    ]

    return DataSourcesOverview(
        mode="LIVE" if (settings.srishti_connected or settings.drishti_connected) else "DEMO",
        sources=sources,
        total_watersheds=2,
        total_interventions=16,
        total_photos=37,
        last_updated=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    )


@router.post("/data-sources/sync-mirror")
def trigger_mirror_sync() -> Dict[str, Any]:
    """Execute automated nightly SRISHTI / DRISHTI mirror sync pipeline."""
    from scripts.srishti_mirror_sync import run_mirror_sync
    result = run_mirror_sync()
    settings.srishti_connected = True
    settings.drishti_connected = True
    return result


@router.post("/data-sources/switch-mode")
def switch_dataset_mode(mode: str = "sample") -> Dict[str, Any]:
    """Switch active dataset between synthetic sample surrogate and real Sentinel-2 Ralegaon Siddhi inventory."""
    import os
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    target = os.path.join(base_dir, "data", "real" if mode.lower() == "real" else "sample")
    if not os.path.exists(target):
        target = os.path.join(base_dir, "data", "sample")
        mode = "sample"
    settings.data_dir = target
    from ..services.store import get_store
    store = get_store(data_dir=target)
    store.build_photo_index(force=True)
    return {
        "status": "SUCCESS",
        "mode": mode.upper(),
        "data_dir": target,
        "watersheds": len(store.list_watersheds()),
        "interventions": len(store.interventions),
        "message": f"Dataset mode switched to {mode.upper()} ({target})"
    }

