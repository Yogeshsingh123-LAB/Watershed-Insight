"""
models_db.py
============
SQLAlchemy database models for Watershed Insight.
Compatible with PostgreSQL and SQLite.
"""

from __future__ import annotations

from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    Text,
    DateTime,
    JSON,
    ForeignKey,
    Index
)
from sqlalchemy.orm import relationship
from .database import Base


class UserDB(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=True)
    role = Column(String(50), nullable=False, default="auditor")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class WatershedDB(Base):
    __tablename__ = "watersheds"

    id = Column(String(50), primary_key=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    district = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    area_ha = Column(Float, nullable=True)
    boundary_geojson = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    interventions = relationship("InterventionDB", back_populates="watershed", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "district": self.district,
            "state": self.state,
            "area_ha": self.area_ha,
            "boundary_geojson": self.boundary_geojson,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class InterventionDB(Base):
    __tablename__ = "interventions"

    id = Column(String(50), primary_key=True)
    watershed_id = Column(String(50), ForeignKey("watersheds.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    type = Column(String(50), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="operational")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    cost_inr = Column(Float, nullable=True)
    installation_date = Column(String(20), nullable=True)
    commissioned_on = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    watershed = relationship("WatershedDB", back_populates="interventions")
    inspections = relationship("FieldInspectionDB", back_populates="intervention", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "watershed_id": self.watershed_id,
            "name": self.name,
            "type": self.type,
            "status": self.status,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "cost_inr": self.cost_inr,
            "installation_date": self.installation_date,
            "commissioned_on": self.commissioned_on,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class FieldInspectionDB(Base):
    __tablename__ = "field_inspections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    inspection_id = Column(String(50), unique=True, nullable=False, index=True)
    watershed_id = Column(String(50), nullable=False, index=True)
    intervention_id = Column(String(50), ForeignKey("interventions.id", ondelete="CASCADE"), nullable=False, index=True)
    inspector_name = Column(String(100), nullable=False)
    inspector_role = Column(String(50), nullable=False, default="field_officer")
    inspection_date = Column(String(20), nullable=False)
    overall_condition = Column(String(50), nullable=False)
    water_presence_observed = Column(Boolean, default=False)
    vegetation_growth_observed = Column(Boolean, default=False)
    structural_integrity = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    photos_attached = Column(JSON, nullable=True, default=list)
    gps_latitude = Column(Float, nullable=True)
    gps_longitude = Column(Float, nullable=True)
    status = Column(String(50), nullable=False, default="VERIFIED")
    created_at = Column(DateTime, default=datetime.utcnow)

    intervention = relationship("InterventionDB", back_populates="inspections")

    def to_dict(self):
        return {
            "id": self.inspection_id,
            "watershed_id": self.watershed_id,
            "intervention_id": self.intervention_id,
            "inspector_name": self.inspector_name,
            "inspector_role": self.inspector_role,
            "inspection_date": self.inspection_date,
            "overall_condition": self.overall_condition,
            "water_presence_observed": self.water_presence_observed,
            "vegetation_growth_observed": self.vegetation_growth_observed,
            "structural_integrity": self.structural_integrity,
            "notes": self.notes,
            "photos_attached": self.photos_attached or [],
            "gps_latitude": self.gps_latitude,
            "gps_longitude": self.gps_longitude,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AuditLogDB(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    log_id = Column(String(50), unique=True, nullable=False, index=True)
    timestamp = Column(String(30), nullable=False, index=True)
    user_id = Column(String(50), nullable=True)
    username = Column(String(50), nullable=False, index=True)
    role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(100), nullable=True)
    details_json = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.log_id,
            "timestamp": self.timestamp,
            "user_id": self.user_id,
            "username": self.username,
            "role": self.role,
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "details": self.details_json or {},
            "ip_address": self.ip_address,
        }


class PhotoDB(Base):
    __tablename__ = "photos"

    id = Column(String(50), primary_key=True)
    watershed_id = Column(String(50), nullable=True, index=True)
    intervention_id = Column(String(50), nullable=True, index=True)
    file_name = Column(String(255), nullable=False)
    phase = Column(String(50), default="after")
    type = Column(String(50), default="uploaded")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    timestamp = Column(String(30), nullable=True)
    quality = Column(String(50), default="verified")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "photo_id": self.id,
            "watershed_id": self.watershed_id,
            "intervention_id": self.intervention_id,
            "file_name": self.file_name,
            "phase": self.phase,
            "type": self.type,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "timestamp": self.timestamp,
            "quality": self.quality,
            "notes": self.notes,
        }
