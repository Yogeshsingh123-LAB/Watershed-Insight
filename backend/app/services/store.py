"""
store.py
========
Data access layer for the Watershed Insight platform.

Responsibilities
----------------
* Read the on-disk dataset (catalog, boundaries, interventions, geo-coded
  photographs, DEM, multi-epoch satellite stacks).
* Build and cache the expensive analytical objects (``RasterProcessor``,
  ``TerrainModel``, LULC classifications, rendered overlays).
* Own the **photo index**: every photograph is parsed from its EXIF, bound to
  the nearest intervention, validated and enriched with a content
  interpretation - this is Module 2 ("Geo-Coded Photo Intelligence").

The store is a plain singleton; no database is required, which keeps the
platform cheap to deploy and trivial to replicate for a new district.
"""

from __future__ import annotations

import csv
import json
import os
import shutil
import threading
import uuid
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

from geospatial.exif_engine import (
    PhotoMetadata,
    bind_to_interventions,
    extract_metadata,
    flag_duplicates,
    make_thumbnail,
    to_geojson_feature,
)
from geospatial.geo_utils import RasterGrid, bbox_of_geojson
from geospatial.hydrology import (
    build_terrain_model,
    catchment_polygon_geojson,
    delineate_catchment,
    stream_geojson,
)
from geospatial.lulc import (
    classify,
    stacked_area_table,
    transition_matrix,
)
from geospatial.photo_interpreter import interpret_photo
from geospatial.raster_processor import RasterProcessor
from geospatial import mapping

from ..config import settings


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _read_json(path: str, default=None):
    if not os.path.exists(path):
        return default
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


class WatershedNotFound(Exception):
    pass


class InterventionNotFound(Exception):
    pass


class PhotoNotFound(Exception):
    pass


# --------------------------------------------------------------------------- #
# Store
# --------------------------------------------------------------------------- #
class DataStore:
    """Thread-safe, lazily-initialised access to every dataset and engine."""

    def __init__(self, data_dir: Optional[str] = None, output_dir: Optional[str] = None):
        self.data_dir = data_dir or settings.data_dir
        self.output_dir = output_dir or settings.output_dir
        self.reports_dir = settings.reports_dir
        for path in (self.output_dir, self.reports_dir, settings.uploads_dir):
            os.makedirs(path, exist_ok=True)

        self._lock = threading.RLock()
        self._processors: Dict[str, RasterProcessor] = {}
        self._terrain: Dict[str, object] = {}
        self._lulc: Dict[Tuple[str, str], object] = {}
        self._photos: Optional[List[PhotoMetadata]] = None
        self._photo_index: Dict[str, PhotoMetadata] = {}
        self._interventions: Optional[List[dict]] = None
        self._catalog: Optional[dict] = None
        self._bmask: Dict[str, np.ndarray] = {}

    # ------------------------------------------------------------------ #
    # Catalog / boundaries
    # ------------------------------------------------------------------ #
    @property
    def catalog(self) -> dict:
        if self._catalog is None:
            with self._lock:
                self._catalog = _read_json(
                    os.path.join(self.data_dir, "catalog", "watersheds.json"),
                    {"hierarchy": [], "watersheds": {}},
                )
        return self._catalog

    def list_watersheds(self) -> List[dict]:
        return list(self.catalog.get("watersheds", {}).values())

    def watershed_meta(self, watershed_id: str) -> dict:
        meta = self.catalog.get("watersheds", {}).get(watershed_id)
        if not meta:
            raise WatershedNotFound(f"Unknown watershed '{watershed_id}'")
        return meta

    def boundary(self, watershed_id: str) -> dict:
        self.watershed_meta(watershed_id)
        path = os.path.join(self.data_dir, "boundaries", f"{watershed_id}.geojson")
        data = _read_json(path)
        if not data:
            raise WatershedNotFound(f"Boundary not found for '{watershed_id}'")
        return data

    # ------------------------------------------------------------------ #
    # Interventions
    # ------------------------------------------------------------------ #
    @property
    def interventions(self) -> List[dict]:
        if self._interventions is None:
            with self._lock:
                fc = _read_json(os.path.join(self.data_dir, "interventions",
                                             "interventions.geojson"),
                                {"type": "FeatureCollection", "features": []})
                self._interventions = [f["properties"] for f in fc.get("features", [])]
        return self._interventions

    def interventions_for(self, watershed_id: str,
                          types: Optional[Sequence[str]] = None,
                          status: Optional[str] = None) -> List[dict]:
        items = [i for i in self.interventions if i.get("watershed_id") == watershed_id]
        if types:
            wanted = {t.lower() for t in types}
            items = [i for i in items if i.get("type", "").lower() in wanted]
        if status:
            items = [i for i in items if i.get("status", "").lower() == status.lower()]
        return items

    def intervention(self, intervention_id: str) -> dict:
        for item in self.interventions:
            if item.get("id") == intervention_id:
                return item
        raise InterventionNotFound(f"Unknown intervention '{intervention_id}'")

    def interventions_geojson(self, watershed_id: Optional[str] = None,
                              types: Optional[Sequence[str]] = None) -> dict:
        items = self.interventions_for(watershed_id, types) if watershed_id else self.interventions
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": item,
                    "geometry": {"type": "Point",
                                 "coordinates": [item["longitude"], item["latitude"]]},
                }
                for item in items
            ],
        }

    # ------------------------------------------------------------------ #
    # Raster / terrain engines
    # ------------------------------------------------------------------ #
    def processor(self, watershed_id: str) -> RasterProcessor:
        if watershed_id not in self._processors:
            with self._lock:
                self._processors[watershed_id] = RasterProcessor(
                    watershed_id=watershed_id, data_dir=self.data_dir)
        return self._processors[watershed_id]

    def terrain(self, watershed_id: str):
        if watershed_id not in self._terrain:
            with self._lock:
                self._terrain[watershed_id] = build_terrain_model(
                    watershed_id=watershed_id, data_dir=self.data_dir,
                    stream_threshold=settings.stream_threshold_cells)
        return self._terrain[watershed_id]

    def boundary_mask(self, watershed_id: str) -> np.ndarray:
        """
        Raster mask of the micro-watershed boundary.

        All watershed-level statistics are clipped to this mask so that areas
        outside the administrative boundary are excluded from the accounting.
        """
        if watershed_id not in self._bmask:
            with self._lock:
                from matplotlib.path import Path

                geometry = self.boundary(watershed_id)["geometry"]
                proc = self.processor(watershed_id)
                grid = proc.grid
                lons = grid.min_lon + (np.arange(grid.width) + 0.5) * grid.dx
                lats = grid.max_lat - (np.arange(grid.height) + 0.5) * grid.dy
                xx, yy = np.meshgrid(lons, lats)
                points = np.column_stack([xx.ravel(), yy.ravel()])

                polys = ([geometry["coordinates"]]
                         if geometry.get("type") == "Polygon"
                         else [poly for multi in geometry["coordinates"] for poly in multi])
                inside = np.zeros(points.shape[0], dtype=bool)
                for poly in polys:
                    ring = poly[0] if isinstance(poly[0][0], (list, tuple)) else poly
                    inside ^= Path(np.asarray(ring)[:, :2], closed=True).contains_points(points)
                self._bmask[watershed_id] = inside.reshape(grid.height, grid.width)
        return self._bmask[watershed_id]

    def lulc(self, watershed_id: str, epoch_key: str):
        key = (watershed_id, epoch_key)
        if key not in self._lulc:
            with self._lock:
                proc = self.processor(watershed_id)
                stack = proc.get_epoch(epoch_key)
                self._lulc[key] = classify(stack.ndvi, stack.ndwi, stack.ndbi,
                                           grid=proc.grid, epoch_key=epoch_key)
        return self._lulc[key]

    # ------------------------------------------------------------------ #
    # Photos
    # ------------------------------------------------------------------ #
    def _csv_rows(self) -> List[dict]:
        path = os.path.join(self.data_dir, "metadata", "photos.csv")
        if not os.path.exists(path):
            return []
        with open(path, "r", encoding="utf-8") as fh:
            return list(csv.DictReader(fh))

    def build_photo_index(self, force: bool = False) -> List[PhotoMetadata]:
        """
        Parse every photograph's EXIF, bind it to the nearest intervention,
        validate it and attach the automated content interpretation.
        """
        if self._photos is not None and not force:
            return self._photos

        with self._lock:
            photos: List[PhotoMetadata] = []
            for row in self._csv_rows():
                file_name = row.get("file_name") or f"{row['photo_id']}.jpg"
                path = os.path.join(settings.photos_dir, file_name)
                if not os.path.exists(path):
                    continue
                meta = extract_metadata(path, row.get("photo_id"))
                # CSV is the DRISHTI sidecar: it wins when EXIF is incomplete.
                if not meta.has_gps and row.get("latitude") and row.get("longitude"):
                    try:
                        meta.latitude = float(row["latitude"])
                        meta.longitude = float(row["longitude"])
                        meta.has_gps = True
                        meta.exif_source = "csv"
                    except (TypeError, ValueError):
                        pass
                if not meta.timestamp and row.get("timestamp"):
                    meta.timestamp = row["timestamp"]
                meta.intervention_id = row.get("intervention_id") or meta.intervention_id
                meta.url = f"/static/photos/{file_name}"
                thumb_name = os.path.join("thumbnails", file_name)
                meta.thumbnail_url = (
                    f"/static/photos/{thumb_name}"
                    if os.path.exists(os.path.join(settings.photos_dir, thumb_name))
                    else meta.url
                )
                setattr(meta, "watershed_id", row.get("watershed_id"))
                setattr(meta, "phase", row.get("phase") or "after")
                setattr(meta, "notes", row.get("notes") or "")
                bind_to_interventions(meta, self.interventions,
                                      buffer_radius_m=settings.photo_bind_radius_m,
                                      max_bind_distance_m=settings.max_photo_bind_distance_m)
                photos.append(meta)

            flag_duplicates(photos)
            for photo in photos:
                self._mark_baseline(photo)

            self._photos = photos
            self._photo_index = {p.photo_id: p for p in photos}
            return photos

    @staticmethod
    def _mark_baseline(photo: PhotoMetadata) -> None:
        """
        A photograph taken before the structure was built is a *baseline* record,
        not an error - unless it claims to be a completion photograph.
        """
        if "CAPTURED_BEFORE_INSTALLATION" not in photo.validation:
            return
        photo.validation.remove("CAPTURED_BEFORE_INSTALLATION")
        if getattr(photo, "phase", "after") == "before":
            photo.validation.append("PRE_IMPLEMENTATION_BASELINE")
            photo.quality = "verified" if photo.quality == "questionable" else photo.quality
        else:
            photo.validation.append("TIMESTAMP_PREDATES_STRUCTURE")
            photo.quality = "questionable"

    @property
    def photos(self) -> List[PhotoMetadata]:
        return self.build_photo_index()

    def photo(self, photo_id: str) -> PhotoMetadata:
        self.build_photo_index()
        if photo_id not in self._photo_index:
            raise PhotoNotFound(f"Unknown photo '{photo_id}'")
        return self._photo_index[photo_id]

    def photos_for(self, watershed_id: Optional[str] = None,
                   intervention_id: Optional[str] = None,
                   quality: Optional[str] = None,
                   has_gps: Optional[bool] = None) -> List[PhotoMetadata]:
        items = self.photos
        if watershed_id:
            target_ids = {i["id"] for i in self.interventions_for(watershed_id)}
            items = [p for p in items if getattr(p, "watershed_id", None) == watershed_id
                     or p.intervention_id in target_ids]
        if intervention_id:
            items = [p for p in items if p.intervention_id == intervention_id]
        if quality:
            items = [p for p in items if p.quality == quality]
        if has_gps is not None:
            items = [p for p in items if p.has_gps == has_gps]
        return items

    def photos_geojson(self, watershed_id: Optional[str] = None) -> dict:
        feats = [to_geojson_feature(p) for p in self.photos_for(watershed_id)]
        return {"type": "FeatureCollection", "features": [f for f in feats if f]}

    def photo_interpretation(self, photo_id: str) -> dict:
        photo = self.photo(photo_id)
        path = os.path.join(settings.photos_dir, photo.file_name)
        result = interpret_photo(path)
        result["photo"] = {
            "photo_id": photo.photo_id,
            "timestamp": photo.timestamp,
            "latitude": photo.latitude,
            "longitude": photo.longitude,
            "intervention_id": photo.intervention_id,
            "distance_m": photo.distance_to_intervention_m,
            "within_buffer": photo.within_buffer,
            "quality": photo.quality,
            "validation": photo.validation,
            "url": photo.url,
        }
        return result

    def photo_stats(self, watershed_id: Optional[str] = None) -> dict:
        items = self.photos_for(watershed_id)
        total = len(items)
        if not total:
            return {"total": 0}
        usable = [p for p in items if p.quality == "verified"]
        return {
            "total": total,
            "with_gps": sum(1 for p in items if p.has_gps),
            "without_gps": sum(1 for p in items if not p.has_gps),
            "verified": len(usable),
            "questionable": sum(1 for p in items if p.quality == "questionable"),
            "acceptable": sum(1 for p in items if p.quality == "acceptable"),
            "within_buffer": sum(1 for p in items if p.within_buffer),
            "outside_buffer": sum(1 for p in items
                                  if p.has_gps and not p.within_buffer),
            "baseline_records": sum(1 for p in items
                                    if "PRE_IMPLEMENTATION_BASELINE" in p.validation),
            "flags": _flag_histogram(items),
            "verified_pct": round(len(usable) / total * 100, 1),
        }

    def add_photo(self, src_path: str, file_name: str,
                  watershed_id: Optional[str] = None,
                  intervention_id: Optional[str] = None,
                  override_lat: Optional[float] = None,
                  override_lon: Optional[float] = None) -> PhotoMetadata:
        """Register a newly uploaded photograph and persist it into the index."""
        dest = os.path.join(settings.uploads_dir, file_name)
        shutil.copy(src_path, dest)
        thumb = make_thumbnail(dest, os.path.join(settings.thumbnails_dir, file_name))
        rel = os.path.join("uploads", file_name)

        meta = extract_metadata(dest, os.path.splitext(file_name)[0])
        if override_lat is not None and override_lon is not None:
            meta.latitude, meta.longitude, meta.has_gps = override_lat, override_lon, True
            meta.exif_source = "manual"
        setattr(meta, "watershed_id", watershed_id)
        setattr(meta, "phase", "after")
        setattr(meta, "notes", "Uploaded through the Watershed Insight dashboard.")
        meta.url = f"/static/photos/{rel}"
        meta.thumbnail_url = (
            f"/static/photos/{os.path.join('thumbnails', file_name)}" if thumb else meta.url)

        bind_to_interventions(meta, self.interventions,
                              buffer_radius_m=settings.photo_bind_radius_m,
                              max_bind_distance_m=settings.max_photo_bind_distance_m)
        if intervention_id and not meta.intervention_id:
            meta.intervention_id = intervention_id
        flag_duplicates(self._photos or [])
        self._mark_baseline(meta)

        self._photos = (self._photos or []) + [meta]
        self._photo_index[meta.photo_id] = meta
        self._append_photo_csv(meta, watershed_id)
        return meta

    def _append_photo_csv(self, meta: PhotoMetadata, watershed_id: Optional[str]) -> None:
        """
        Persist the upload into the DRISHTI sidecar CSV.

        Set ``WS_PERSIST_UPLOADS=false`` (as the test-suite does) to keep the
        shipped sample dataset untouched while still exercising the ingest path.
        """
        if os.getenv("WS_PERSIST_UPLOADS", "true").strip().lower() in ("0", "false", "no"):
            return
        path = os.path.join(self.data_dir, "metadata", "photos.csv")
        fieldnames = ["photo_id", "watershed_id", "intervention_id", "file_name", "phase",
                      "type", "latitude", "longitude", "timestamp", "expected_quality", "notes"]
        row = {
            "photo_id": meta.photo_id,
            "watershed_id": watershed_id or "",
            "intervention_id": meta.intervention_id or "",
            "file_name": os.path.join("uploads", meta.file_name),
            "phase": "after",
            "type": "uploaded",
            "latitude": meta.latitude if meta.latitude is not None else "",
            "longitude": meta.longitude if meta.longitude is not None else "",
            "timestamp": meta.timestamp or "",
            "expected_quality": "ok",
            "notes": "Uploaded through the dashboard.",
        }
        try:
            exists = os.path.exists(path)
            with open(path, "a", newline="", encoding="utf-8") as fh:
                writer = csv.DictWriter(fh, fieldnames=fieldnames)
                if not exists:
                    writer.writeheader()
                writer.writerow(row)
        except OSError:
            pass

    # ------------------------------------------------------------------ #
    # Overlays (rendered on demand, cached on disk)
    # ------------------------------------------------------------------ #
    def overlay_path(self, watershed_id: str, name: str, epoch_key: Optional[str] = None,
                     alpha: Optional[float] = None) -> str:
        """
        Return a URL for a map overlay, rendering it on first request.

        ``name``: ndvi | ndwi | ndbi | savi | delta | lulc | hillshade | slope | twi
        """
        proc = self.processor(watershed_id)
        epoch_key = epoch_key or proc.t1_key
        alpha = settings.overlay_alpha if alpha is None else alpha
        safe_epoch = epoch_key.replace(os.sep, "_")
        out_name = f"{watershed_id}_{name}_{safe_epoch}.png"
        out_path = os.path.join(self.output_dir, out_name)
        url = f"/static/overlays/{out_name}"

        if os.path.exists(out_path):
            return url

        with self._lock:
            if os.path.exists(out_path):
                return url
            if name == "lulc":
                mapping.save_lulc_overlay(self.lulc(watershed_id, epoch_key).classes,
                                          out_path, alpha=alpha)
            elif name == "delta":
                a = proc.index(proc.t0_key, "ndvi")
                b = proc.index(epoch_key, "ndvi")
                mapping.save_index_overlay(b - a, proc.grid, out_path, "delta", alpha=alpha)
            elif name == "hillshade":
                terrain = self.terrain(watershed_id)
                mapping.save_hillshade_overlay(terrain.dem, terrain.grid, out_path, alpha=alpha)
            elif name in ("slope", "twi"):
                terrain = self.terrain(watershed_id)
                array = terrain.slope_pct if name == "slope" else terrain.twi
                palette = "terrain" if name == "slope" else "delta"
                vmin, vmax = (0.0, float(np.nanpercentile(array, 98))) if name == "slope" \
                    else (float(np.nanpercentile(array, 2)), float(np.nanpercentile(array, 98)))
                mapping.save_index_overlay(array, terrain.grid, out_path, palette,
                                           vmin=vmin, vmax=vmax, alpha=alpha)
            else:
                mapping.save_index_overlay(proc.index(epoch_key, name), proc.grid,
                                           out_path, name if name in ("ndvi", "ndwi") else "delta",
                                           alpha=alpha)
        return url

    def overlay_bounds(self, watershed_id: str) -> List[List[float]]:
        return self.processor(watershed_id).grid.leaflet_bounds()

    # ------------------------------------------------------------------ #
    # Analytics
    # ------------------------------------------------------------------ #
    def watershed_stats(self, watershed_id: str) -> dict:
        proc = self.processor(watershed_id)
        meta = self.watershed_meta(watershed_id)
        stats = proc.watershed_stats(mask=self.boundary_mask(watershed_id))
        stats.update({
            "interventions": len(self.interventions_for(watershed_id)),
            "photos": len(self.photos_for(watershed_id)),
            "photos_verified": sum(1 for p in self.photos_for(watershed_id)
                                   if p.quality == "verified"),
            "area_ha": meta.get("area_ha"),
            "code": meta.get("code"),
            "name": meta.get("name"),
        })
        return stats

    def change_detection(self, watershed_id: str, index_name: str = "ndvi",
                         epoch_a: Optional[str] = None,
                         epoch_b: Optional[str] = None) -> dict:
        proc = self.processor(watershed_id)
        result = proc.change_detection(index_name, epoch_a, epoch_b,
                                       mask=self.boundary_mask(watershed_id))
        result.pop("delta", None)          # arrays are not JSON serialisable
        return result

    def hotspots(self, watershed_id: str, index_name: str = "ndvi", top_n: int = 5) -> dict:
        return self.processor(watershed_id).hotspots(index_name, top_n)

    def lulc_summary(self, watershed_id: str, mask_lat: Optional[float] = None,
                     mask_lon: Optional[float] = None,
                     radius_m: Optional[float] = None) -> dict:
        proc = self.processor(watershed_id)
        if mask_lat is not None and mask_lon is not None and radius_m:
            mask = proc.buffer_mask(mask_lat, mask_lon, radius_m)
        else:
            mask = self.boundary_mask(watershed_id)
        t0 = self.lulc(watershed_id, proc.t0_key)
        t1 = self.lulc(watershed_id, proc.t1_key)
        area = proc.pixel_area_ha
        return {
            "watershed_id": watershed_id,
            "epoch_t0": proc.t0.date,
            "epoch_t1": proc.t1.date,
            "classes": stacked_area_table(t0, t1, area, mask),
            "shares_t0_pct": t0.share_by_class_pct(area, mask),
            "shares_t1_pct": t1.share_by_class_pct(area, mask),
            "transition": transition_matrix(t0, t1, area, mask),
            "legend": t1.legend(),
        }

    def timeseries(self, watershed_id: str, lat: Optional[float] = None,
                   lon: Optional[float] = None, radius_m: float = 250.0) -> List[dict]:
        mask = None if lat is not None else self.boundary_mask(watershed_id)
        return self.processor(watershed_id).time_series(lat, lon, radius_m, mask=mask)

    def drainage(self, watershed_id: str, pour_lat: Optional[float] = None,
                 pour_lon: Optional[float] = None,
                 max_features: int = 400) -> dict:
        terrain = self.terrain(watershed_id)
        streams = stream_geojson(terrain.streams, terrain.order, terrain.flow_dir,
                                 terrain.grid, max_features=max_features)
        payload = {
            "watershed_id": watershed_id,
            "morphometry": terrain.stats,
            "streams": streams,
            "stream_threshold_cells": settings.stream_threshold_cells,
        }
        if pour_lat is not None and pour_lon is not None:
            mask, cell = delineate_catchment(terrain.flow_dir, terrain.grid, pour_lat, pour_lon)
            area = np.broadcast_to(terrain.grid.pixel_area_ha(), mask.shape)
            payload["catchment"] = {
                "pour_point": {"lat": pour_lat, "lon": pour_lon},
                "snapped_cell": {"row": cell[0], "col": cell[1]},
                "area_ha": round(float(area[mask].sum()), 2),
                "cells": int(mask.sum()),
                "geometry": catchment_polygon_geojson(mask, terrain.grid),
            }
        return payload

    def terrain_summary(self, watershed_id: str) -> dict:
        terrain = self.terrain(watershed_id)
        slope = terrain.slope_pct
        return {
            "watershed_id": watershed_id,
            "morphometry": terrain.stats,
            "slope_classes_ha": _slope_class_areas(slope, terrain.grid.pixel_area_ha()),
            "elevation_profile": _elevation_profile(terrain.dem),
        }

    def intervention_analysis(self, intervention_id: str, radius_m: float = 250.0,
                              epoch_a: Optional[str] = None,
                              epoch_b: Optional[str] = None) -> dict:
        """Full evidence bundle for one intervention (Module 3 + 4)."""
        item = self.intervention(intervention_id)
        proc = self.processor(item["watershed_id"])
        analysis = proc.analyse_buffer(item["latitude"], item["longitude"],
                                       radius_m, epoch_a, epoch_b)
        photos = self.photos_for(intervention_id=intervention_id)
        return {
            "intervention": item,
            "analysis": analysis,
            "timeseries": proc.time_series(item["latitude"], item["longitude"], radius_m),
            "lulc": self.lulc_summary(item["watershed_id"], item["latitude"],
                                      item["longitude"], radius_m),
            "matched_photos": [p.to_dict() for p in photos],
            "cross_checks": [
                {**self.photo_interpretation(p.photo_id),
                 "cross_check": _cross_check(p, analysis)}
                for p in photos[:6]
            ],
        }

    def ranking(self, watershed_id: str, radius_m: float = 250.0) -> List[dict]:
        """
        Impact ranking for prioritisation: what is working, what needs a field
        visit, and what the public money bought per hectare of improvement.
        """
        proc = self.processor(watershed_id)
        rows = []
        for item in self.interventions_for(watershed_id):
            analysis = proc.analyse_buffer(item["latitude"], item["longitude"], radius_m)
            cost = float(item.get("cost_inr") or 0.0)
            veg_gain = float(analysis.get("veg_area_change_ha") or 0.0)
            water_gain = float(analysis.get("water_area_change_ha") or 0.0)
            rows.append({
                "id": item["id"],
                "name": item["name"],
                "type": item["type"],
                "status": item.get("status"),
                "installation_date": item.get("installation_date"),
                "latitude": item["latitude"],
                "longitude": item["longitude"],
                "cost_inr": cost,
                "impact_score": analysis["impact_score"],
                "confidence": analysis["confidence"],
                "ndvi_change": analysis["ndvi_change"],
                "ndvi_change_land": analysis["ndvi_change_land"],
                "water_area_change_ha": analysis["water_area_change_ha"],
                "veg_area_change_ha": veg_gain,
                "photos": len(self.photos_for(intervention_id=item["id"])),
                "cost_per_ha_improved_inr": (
                    int(cost / max(veg_gain + water_gain, 0.01)) if cost else None
                ),
                "interpretation": analysis["interpretation"],
            })
        rows.sort(key=lambda r: r["impact_score"], reverse=True)
        for i, row in enumerate(rows, start=1):
            row["rank"] = i
            row["recommendation"] = _recommendation(row)
        return rows

    def watershed_summary(self, watershed_id: str) -> dict:
        """Everything the dashboard needs in a single round-trip."""
        meta = self.watershed_meta(watershed_id)
        proc = self.processor(watershed_id)
        terrain = self.terrain(watershed_id)
        ranking = self.ranking(watershed_id)
        return {
            "watershed": {**meta, "boundary": self.boundary(watershed_id)},
            "stats": self.watershed_stats(watershed_id),
            "epochs": [e.to_dict() for e in proc.epochs],
            "bounds": proc.bounds(),
            "overlay_bounds": proc.grid.leaflet_bounds(),
            "timeseries": self.timeseries(watershed_id),
            "lulc": self.lulc_summary(watershed_id),
            "change_detection": self.change_detection(watershed_id),
            "hotspots": self.hotspots(watershed_id),
            "terrain": self.terrain_summary(watershed_id),
            "streams": stream_geojson(terrain.streams, terrain.order, terrain.flow_dir,
                                      terrain.grid, max_features=400),
            "ranking": ranking,
            "photo_stats": self.photo_stats(watershed_id),
            "interventions": self.interventions_geojson(watershed_id),
            "photos": self.photos_geojson(watershed_id),
        }


# --------------------------------------------------------------------------- #
# Module-level helpers
# --------------------------------------------------------------------------- #
def _flag_histogram(photos: Sequence[PhotoMetadata]) -> Dict[str, int]:
    hist: Dict[str, int] = {}
    for photo in photos:
        for flag in photo.validation:
            key = flag.split("_WITH_")[0]
            hist[key] = hist.get(key, 0) + 1
    return hist


def _slope_class_areas(slope_pct: np.ndarray, pixel_area_ha: np.ndarray) -> Dict[str, float]:
    """Area in each IWMP slope class (used to target bunding vs. afforestation)."""
    area = np.broadcast_to(pixel_area_ha, slope_pct.shape)
    bins = [("0-2% (nearly level)", 0, 2), ("2-5% (very gentle)", 2, 5),
            ("5-10% (gentle)", 5, 10), ("10-15% (moderate)", 10, 15),
            ("15-25% (steep)", 15, 25), (">25% (very steep)", 25, 1e9)]
    return {
        label: round(float(area[(slope_pct >= low) & (slope_pct < high)].sum()), 2)
        for label, low, high in bins
    }


def _elevation_profile(dem: np.ndarray, bins: int = 10) -> List[dict]:
    counts, edges = np.histogram(dem, bins=bins)
    total = float(counts.sum())
    return [
        {
            "from_m": round(float(edges[i]), 1),
            "to_m": round(float(edges[i + 1]), 1),
            "pct_of_area": round(float(counts[i]) / total * 100, 2) if total else 0.0,
        }
        for i in range(bins)
    ]


def _cross_check(photo: PhotoMetadata, analysis: dict) -> dict:
    from geospatial.photo_interpreter import cross_check_with_satellite
    try:
        result = interpret_photo(os.path.join(settings.photos_dir, photo.file_name))
        return cross_check_with_satellite(result, analysis)
    except Exception:
        return {"status": "not_available"}


def _recommendation(row: dict) -> str:
    score = row["impact_score"]
    if score >= 60:
        return "Effective - retain as a demonstration site and replicate the design upstream."
    if score >= 42:
        return "Performing - schedule routine desilting and one more seasonal observation."
    if score >= 25:
        return "Under-performing - field inspection required (check siltation, inlet, seepage)."
    return "No measurable response - prioritise for field verification and possible remediation."


# --------------------------------------------------------------------------- #
# Singleton
# --------------------------------------------------------------------------- #
_store: Optional[DataStore] = None


def get_store() -> DataStore:
    """Process-wide store singleton (also used as a FastAPI dependency)."""
    global _store
    if _store is None:
        _store = DataStore()
    return _store
