"""
config.py
=========
Central configuration for the Watershed Insight API.

Values are read from the environment (12-factor style) with sensible defaults so
the platform boots straight out of a fresh clone.  ``.env.example`` documents
every variable.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import List

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _env_list(name: str, default: str) -> List[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


import tempfile


def _get_writable_path(env_var: str, default_rel: str) -> str:
    val = os.getenv(env_var)
    if val:
        return val
    if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        path = os.path.join(tempfile.gettempdir(), default_rel)
        try:
            os.makedirs(path, exist_ok=True)
        except OSError:
            pass
        return path
    return os.path.join(BASE_DIR, default_rel)


@dataclass
class Settings:
    """Runtime configuration."""

    # --- paths ----------------------------------------------------------- #
    base_dir: str = BASE_DIR
    data_dir: str = field(default_factory=lambda: os.getenv(
        "WS_DATA_DIR", os.path.join(BASE_DIR, "data", "sample")))
    output_dir: str = field(default_factory=lambda: _get_writable_path(
        "WS_OUTPUT_DIR", os.path.join("data", "sample", "overlays")))
    reports_dir: str = field(default_factory=lambda: _get_writable_path(
        "WS_REPORTS_DIR", os.path.join("reports", "generated")))

    # --- API -------------------------------------------------------------- #
    api_prefix: str = "/api/v1"
    project_name: str = "Watershed Insight API"
    version: str = "1.0.0"
    cors_origins: List[str] = field(default_factory=lambda: _env_list("WS_CORS_ORIGINS", "*"))
    debug: bool = field(default_factory=lambda: _env_bool("WS_DEBUG", False))
    database_url: str = field(default_factory=lambda: os.getenv(
        "DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'data', 'watershed.db')}"))
    use_db_store: bool = field(default_factory=lambda: _env_bool("WS_USE_DB_STORE", False))

    # --- analytical defaults ---------------------------------------------- #
    default_buffer_m: int = int(os.getenv("WS_BUFFER_M", "250"))
    max_buffer_m: int = 2000
    min_buffer_m: int = 25
    water_ndwi_threshold: float = float(os.getenv("WS_WATER_NDWI", "0.10"))
    veg_ndvi_threshold: float = float(os.getenv("WS_VEG_NDVI", "0.30"))
    stream_threshold_cells: int = int(os.getenv("WS_STREAM_THRESHOLD", "220"))
    photo_bind_radius_m: float = float(os.getenv("WS_PHOTO_BIND_RADIUS", "250"))
    max_photo_bind_distance_m: float = 2000.0
    max_upload_mb: int = int(os.getenv("WS_MAX_UPLOAD_MB", "25"))

    # --- behaviour --------------------------------------------------------- #
    cache_terrain: bool = _env_bool("WS_CACHE_TERRAIN", True)
    overlay_alpha: float = float(os.getenv("WS_OVERLAY_ALPHA", "0.8"))
    srishti_connected: bool = _env_bool("WS_SRISHTI_CONNECTED", False)
    drishti_connected: bool = _env_bool("WS_DRISHTI_CONNECTED", False)

    @property
    def photos_dir(self) -> str:
        return os.path.join(self.data_dir, "photos")

    @property
    def thumbnails_dir(self) -> str:
        return os.path.join(self.data_dir, "photos", "thumbnails")

    @property
    def uploads_dir(self) -> str:
        if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
            path = os.path.join(tempfile.gettempdir(), "uploads")
            try:
                os.makedirs(path, exist_ok=True)
            except OSError:
                pass
            return path
        return os.path.join(self.data_dir, "photos", "uploads")

    @property
    def audit_log_path(self) -> str:
        if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
            return os.path.join(tempfile.gettempdir(), "audit_log.json")
        return os.path.join(self.data_dir, "metadata", "audit_log.json")

    @property
    def field_inspections_path(self) -> str:
        if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
            return os.path.join(tempfile.gettempdir(), "field_inspections.json")
        return os.path.join(self.data_dir, "metadata", "field_inspections.json")


settings = Settings()
