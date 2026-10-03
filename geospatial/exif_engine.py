"""
exif_engine.py
==============
Geo-coded image intelligence for the DRISHTI / SRISHTI photo stream.

The Department of Land Resources collects tens of thousands of geo-tagged field
photographs every year.  This module turns those photographs into *structured
spatial evidence*:

* **EXIF extraction** - GPS latitude/longitude, capture timestamp, device,
  altitude and image dimensions read straight out of the JPEG container.
* **Spatial binding** - every photograph is attached to the nearest watershed
  intervention by great-circle distance, with an explicit "inside / outside the
  buffer" verdict.
* **Evidence validation** - flags missing GPS, implausible timestamps (photo
  captured *before* the structure was sanctioned), duplicate captures and
  photos taken outside the watershed boundary.
* **Orientation & thumbnails** - normalises EXIF orientation and produces the
  small previews used by the dashboard and the PDF evidence pack.

No external service is required: everything runs offline on the image files.
"""

from __future__ import annotations

import datetime as dt
import io
import json
import os
from dataclasses import asdict, dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

from PIL import Image, ImageOps

from .geo_utils import bbox_of_geojson, haversine_m

try:  # piexif is the reference reader/writer used by the project
    import piexif
except ImportError:  # pragma: no cover - optional dependency
    piexif = None


DEFAULT_BUFFER_M = 250.0


# --------------------------------------------------------------------------- #
# Data model
# --------------------------------------------------------------------------- #
@dataclass
class PhotoMetadata:
    """Everything the platform knows about one geo-coded field photograph."""
    photo_id: str
    file_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude_m: Optional[float] = None
    timestamp: Optional[str] = None          # ISO 8601
    make: Optional[str] = None
    model: Optional[str] = None
    software: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    file_size_kb: Optional[float] = None
    orientation: int = 1
    has_gps: bool = False
    exif_source: str = "none"                 # piexif | pillow | csv | none
    # Derived / enriched
    intervention_id: Optional[str] = None
    distance_to_intervention_m: Optional[float] = None
    within_buffer: bool = False
    buffer_radius_m: float = DEFAULT_BUFFER_M
    bearing_from_intervention: Optional[float] = None
    days_after_installation: Optional[int] = None
    validation: List[str] = field(default_factory=list)
    quality: str = "unknown"                  # verified | acceptable | questionable
    url: Optional[str] = None
    thumbnail_url: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


# --------------------------------------------------------------------------- #
# EXIF parsing
# --------------------------------------------------------------------------- #
def dms_to_decimal(dms: Sequence[Tuple[int, int]], ref: str) -> Optional[float]:
    """Convert EXIF GPS rational DMS ``((deg,den),(min,den),(sec,den))`` to decimal."""
    try:
        degrees = dms[0][0] / dms[0][1]
        minutes = dms[1][0] / dms[1][1]
        seconds = dms[2][0] / dms[2][1] if len(dms) > 2 else 0.0
        value = degrees + minutes / 60.0 + seconds / 3600.0
        if ref in ("S", "W"):
            value = -value
        return round(value, 7)
    except (IndexError, ZeroDivisionError, TypeError):
        return None


def _rational_to_float(value) -> Optional[float]:
    try:
        if isinstance(value, tuple):
            return value[0] / value[1] if value[1] else None
        return float(value)
    except (TypeError, ZeroDivisionError):
        return None


def _parse_exif_datetime(raw: str) -> Optional[str]:
    """'2025:07:10 10:15:30' -> '2025-07-10T10:15:30'."""
    if not raw:
        return None
    raw = raw.strip().replace("\x00", "")
    for fmt in ("%Y:%m:%d %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y:%m:%d %H:%M", "%Y-%m-%dT%H:%M:%S"):
        try:
            return dt.datetime.strptime(raw, fmt).isoformat()
        except ValueError:
            continue
    return None


def extract_metadata(path: str, photo_id: Optional[str] = None) -> PhotoMetadata:
    """
    Read GPS + capture metadata from a JPEG.  Falls back to Pillow's EXIF and
    then to an empty (unverified) record rather than raising, so a batch upload
    never fails because of one corrupt photograph.
    """
    name = os.path.basename(path)
    meta = PhotoMetadata(photo_id=photo_id or os.path.splitext(name)[0], file_name=name)

    try:
        meta.file_size_kb = round(os.path.getsize(path) / 1024.0, 1)
    except OSError:
        meta.file_size_kb = None

    try:
        with Image.open(path) as img:
            meta.width, meta.height = img.size
    except Exception:
        return meta

    if piexif is not None:
        try:
            exif_dict = piexif.load(path)
        except Exception:
            exif_dict = None
        if exif_dict:
            zeroth = exif_dict.get("0th", {}) or {}
            exif_ifd = exif_dict.get("Exif", {}) or {}
            gps = exif_dict.get("GPS", {}) or {}
            meta.exif_source = "piexif"

            def _decode(value):
                if isinstance(value, bytes):
                    return value.decode("utf-8", "ignore").replace("\x00", "").strip()
                return value

            meta.make = _decode(zeroth.get(piexif.ImageIFD.Make, "")) or None
            meta.model = _decode(zeroth.get(piexif.ImageIFD.Model, "")) or None
            meta.software = _decode(zeroth.get(piexif.ImageIFD.Software, "")) or None
            meta.orientation = int(zeroth.get(piexif.ImageIFD.Orientation, 1) or 1)

            raw_dt = _decode(exif_ifd.get(piexif.ExifIFD.DateTimeOriginal, "")) or \
                _decode(zeroth.get(piexif.ImageIFD.DateTime, ""))
            meta.timestamp = _parse_exif_datetime(raw_dt or "")

            lat = dms_to_decimal(gps.get(piexif.GPSIFD.GPSLatitude, []),
                                 _decode(gps.get(piexif.GPSIFD.GPSLatitudeRef, "N")) or "N")
            lon = dms_to_decimal(gps.get(piexif.GPSIFD.GPSLongitude, []),
                                 _decode(gps.get(piexif.GPSIFD.GPSLongitudeRef, "E")) or "E")
            if lat is not None and lon is not None:
                meta.latitude, meta.longitude = lat, lon
                meta.has_gps = True
            alt = _rational_to_float(gps.get(piexif.GPSIFD.GPSAltitude))
            if alt is not None and int(gps.get(piexif.GPSIFD.GPSAltitudeRef, 0) or 0) == 1:
                alt = -alt
            meta.altitude_m = round(alt, 1) if alt is not None else None

    if not meta.timestamp or not meta.has_gps:
        meta = _fallback_pillow_exif(path, meta)

    return meta


def _fallback_pillow_exif(path: str, meta: PhotoMetadata) -> PhotoMetadata:
    """Pillow-based EXIF fallback for images piexif cannot parse."""
    try:
        with Image.open(path) as img:
            exif = img.getexif()
            if not exif:
                return meta
            gps_info = exif.get_ifd(0x8825) if hasattr(exif, "get_ifd") else {}
            if gps_info and not meta.has_gps:
                lat = dms_to_decimal(gps_info.get(2, []), gps_info.get(1, "N"))
                lon = dms_to_decimal(gps_info.get(4, []), gps_info.get(3, "E"))
                if lat is not None and lon is not None:
                    meta.latitude, meta.longitude = lat, lon
                    meta.has_gps = True
                    meta.exif_source = meta.exif_source if meta.exif_source != "none" else "pillow"
            if not meta.timestamp:
                raw = exif.get(0x9003) or exif.get(0x0132)
                meta.timestamp = _parse_exif_datetime(str(raw)) if raw else None
            if not meta.make:
                meta.make = exif.get(0x010F)
            if not meta.model:
                meta.model = exif.get(0x0110)
    except Exception:
        pass
    return meta


def write_gps_exif(src_path: str, dst_path: str, lat: float, lon: float,
                   timestamp: Optional[str] = None) -> str:
    """(Re)write GPS EXIF on a copy - used by the geo-tagging utility endpoint."""
    if piexif is None:
        raise RuntimeError("piexif is required to write EXIF GPS tags")

    def _to_dms(value: float) -> list:
        deg = int(abs(value))
        minutes_float = (abs(value) - deg) * 60
        minute = int(minutes_float)
        sec = round((minutes_float - minute) * 60 * 100)   # seconds * 100
        return [(deg, 1), (minute, 1), (sec, 100)]

    gps = {
        piexif.GPSIFD.GPSLatitudeRef: "N" if lat >= 0 else "S",
        piexif.GPSIFD.GPSLatitude: _to_dms(lat),
        piexif.GPSIFD.GPSLongitudeRef: "E" if lon >= 0 else "W",
        piexif.GPSIFD.GPSLongitude: _to_dms(lon),
    }
    exif_bytes = piexif.dump({"GPS": gps})
    with Image.open(src_path) as img:
        img = ImageOps.exif_transpose(img)
        img.save(dst_path, "jpeg", exif=exif_bytes, quality=88)
    return dst_path


# --------------------------------------------------------------------------- #
# Spatial binding
# --------------------------------------------------------------------------- #
def bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Initial compass bearing from point 1 -> point 2 (degrees from north)."""
    import math
    phi1, phi2 = map(math.radians, (lat1, lat2))
    d_lon = math.radians(lon2 - lon1)
    x = math.sin(d_lon) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(d_lon)
    return round((math.degrees(math.atan2(x, y)) + 360) % 360, 1)


def bind_to_interventions(photo: PhotoMetadata, interventions: Sequence[dict],
                          buffer_radius_m: float = DEFAULT_BUFFER_M,
                          max_bind_distance_m: float = 1500.0) -> PhotoMetadata:
    """
    Attach the photograph to the nearest intervention and record the evidence
    geometry (distance, bearing, inside/outside buffer).
    """
    photo.buffer_radius_m = buffer_radius_m
    if not photo.has_gps or not interventions:
        photo.validation.append("MISSING_GPS" if not photo.has_gps else "NO_INTERVENTIONS")
        photo.quality = "questionable"
        return photo

    best, best_dist = None, float("inf")
    for item in interventions:
        lat = item.get("latitude")
        lon = item.get("longitude")
        if lat is None or lon is None:
            continue
        dist = haversine_m(photo.latitude, photo.longitude, float(lat), float(lon))
        if dist < best_dist:
            best, best_dist = item, dist

    if best is None or best_dist > max_bind_distance_m:
        photo.validation.append("NO_INTERVENTION_WITHIN_RANGE")
        photo.quality = "questionable"
        return photo

    photo.intervention_id = best.get("id")
    photo.distance_to_intervention_m = round(best_dist, 1)
    photo.within_buffer = best_dist <= buffer_radius_m
    photo.bearing_from_intervention = bearing_deg(
        float(best["latitude"]), float(best["longitude"]),
        photo.latitude, photo.longitude)

    if not photo.within_buffer:
        photo.validation.append("OUTSIDE_BUFFER")

    # Temporal plausibility: was the photo taken after the structure existed?
    install_date = best.get("installation_date")
    if install_date and photo.timestamp:
        try:
            installed = dt.date.fromisoformat(str(install_date)[:10])
            captured = dt.date.fromisoformat(photo.timestamp[:10])
            delta_days = (captured - installed).days
            photo.days_after_installation = delta_days
            if delta_days < 0:
                photo.validation.append("CAPTURED_BEFORE_INSTALLATION")
        except ValueError:
            pass

    if not photo.timestamp:
        photo.validation.append("MISSING_TIMESTAMP")
    if not photo.validation:
        photo.quality = "verified"
    elif any(v in photo.validation for v in ("MISSING_GPS", "MISSING_TIMESTAMP",
                                             "CAPTURED_BEFORE_INSTALLATION",
                                             "NO_INTERVENTION_WITHIN_RANGE")):
        photo.quality = "questionable"
    else:
        photo.quality = "acceptable"
    return photo


def flag_duplicates(photos: Sequence[PhotoMetadata],
                    distance_m: float = 15.0,
                    same_day: bool = True) -> None:
    """Mark photographs captured at (almost) the same place on the same day."""
    for i, a in enumerate(photos):
        if not a.has_gps or not a.timestamp:
            continue
        for b in photos[i + 1:]:
            if not b.has_gps or not b.timestamp:
                continue
            if same_day and a.timestamp[:10] != b.timestamp[:10]:
                continue
            if haversine_m(a.latitude, a.longitude, b.latitude, b.longitude) <= distance_m:
                msg = f"DUPLICATE_LOCATION_WITH_{b.photo_id}"
                a.validation.append(msg)
                b.validation.append(f"DUPLICATE_LOCATION_WITH_{a.photo_id}")
                a.quality = "questionable" if a.quality == "verified" else a.quality
                b.quality = "questionable" if b.quality == "verified" else b.quality


def inside_boundary(photo: PhotoMetadata, boundary_geometry: dict) -> bool:
    """Very small point-in-polygon test (ray casting) on a Polygon geometry."""
    if not photo.has_gps or not boundary_geometry:
        return False
    polys = boundary_geometry.get("coordinates", [])
    if boundary_geometry.get("type") == "Polygon":
        polys = [polys]
    x, y = photo.longitude, photo.latitude
    inside = False
    for poly in polys:
        ring = poly[0] if poly and isinstance(poly[0][0], (list, tuple)) else poly
        for i in range(len(ring)):
            x1, y1 = ring[i][0], ring[i][1]
            x2, y2 = ring[(i + 1) % len(ring)][0], ring[(i + 1) % len(ring)][1]
            if ((y1 > y) != (y2 > y)) and (x < (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-12) + x1):
                inside = not inside
    return inside


# --------------------------------------------------------------------------- #
# Serialisation helpers
# --------------------------------------------------------------------------- #
def to_geojson_feature(photo: PhotoMetadata) -> Optional[dict]:
    """GeoJSON point feature for the map layer (None if the photo has no GPS)."""
    if not photo.has_gps:
        return None
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [photo.longitude, photo.latitude]},
        "properties": {
            "photo_id": photo.photo_id,
            "timestamp": photo.timestamp,
            "intervention_id": photo.intervention_id,
            "distance_m": photo.distance_to_intervention_m,
            "within_buffer": photo.within_buffer,
            "quality": photo.quality,
            "url": photo.url,
            "thumbnail_url": photo.thumbnail_url,
            "validation": photo.validation,
        },
    }


def make_thumbnail(src_path: str, dst_path: str, size: Tuple[int, int] = (320, 320)) -> Optional[str]:
    """Orientation-corrected JPEG thumbnail for the gallery / PDF pack."""
    try:
        os.makedirs(os.path.dirname(dst_path), exist_ok=True)
        with Image.open(src_path) as img:
            img = ImageOps.exif_transpose(img)
            img.thumbnail(size, Image.LANCZOS)
            if img.mode != "RGB":
                img = img.convert("RGB")
            img.save(dst_path, "jpeg", quality=82)
        return dst_path
    except Exception:
        return None
