"""
auth.py - Government Officer Authentication & User Account Management Router.

Provides endpoints for Officer Login, Account Registration, Role Switching,
and Current User Profile Retrieval.
"""

from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/auth", tags=["Authentication & Officers"])

# In-memory store for registered government officers (seeded with default roles)
OFFICERS_DB: Dict[str, Dict[str, Any]] = {
    "district.officer@dolr.gov.in": {
        "id": "OFF-DIST-001",
        "name": "Dr. Rajesh Kumar Sharma",
        "email": "district.officer@dolr.gov.in",
        "role": "DISTRICT_OFFICER",
        "role_title": "District Collector / Nodal Officer",
        "department": "Department of Land Resources",
        "district": "Pune",
        "state": "Maharashtra",
        "created_at": "2025-01-15T10:00:00Z",
    },
    "watershed.officer@dolr.gov.in": {
        "id": "OFF-WDT-002",
        "name": "Priya Deshmukh",
        "email": "watershed.officer@dolr.gov.in",
        "role": "WATERSHED_OFFICER",
        "role_title": "Watershed Development Team Lead",
        "department": "WDT Monitoring Cell",
        "district": "Pune",
        "state": "Maharashtra",
        "created_at": "2025-02-01T11:30:00Z",
    },
    "field.inspector@dolr.gov.in": {
        "id": "OFF-FLD-003",
        "name": "Amit V. Patil",
        "email": "field.inspector@dolr.gov.in",
        "role": "FIELD_OFFICER",
        "role_title": "DRISHTI Mobile Field Inspector",
        "department": "Field Monitoring Unit",
        "district": "Pune",
        "state": "Maharashtra",
        "created_at": "2025-02-10T14:15:00Z",
    },
    "admin@dolr.gov.in": {
        "id": "OFF-ADM-000",
        "name": "Super Admin Nodal",
        "email": "admin@dolr.gov.in",
        "role": "ADMIN",
        "role_title": "National System Administrator",
        "department": "DoLR HQ New Delhi",
        "district": "National",
        "state": "All",
        "created_at": "2024-12-01T09:00:00Z",
    }
}

class LoginRequest(BaseModel):
    email: str = Field(..., json_schema_extra={"example": "district.officer@dolr.gov.in"})
    password: str = Field(..., json_schema_extra={"example": "Govt@2026#DoLR"})
    role: Optional[str] = None

class RegisterRequest(BaseModel):
    name: str = Field(..., json_schema_extra={"example": "Suresh Verma"})
    email: str = Field(..., json_schema_extra={"example": "suresh.verma@nic.in"})
    password: str = Field(..., min_length=6, json_schema_extra={"example": "SecurePassword#1"})
    role: str = Field(..., json_schema_extra={"example": "FIELD_OFFICER"})
    department: str = Field("Department of Land Resources", json_schema_extra={"example": "WDT Monitoring"})
    district: str = Field("Pune", json_schema_extra={"example": "Pune"})
    state: str = Field("Maharashtra", json_schema_extra={"example": "Maharashtra"})

class OfficerResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    role_title: str
    department: str
    district: str
    state: str
    access_token: str
    token_type: str = "bearer"

@router.post("/login", response_model=OfficerResponse)
def login_officer(req: LoginRequest) -> Dict[str, Any]:
    """Authenticate an existing Government Officer or create a demo session."""
    email_clean = req.email.strip().lower()
    
    # If officer exists in DB
    if email_clean in OFFICERS_DB:
        officer = OFFICERS_DB[email_clean]
    else:
        # Auto-provision user session if email provided during demo
        officer = {
            "id": f"OFF-USER-{uuid.uuid4().hex[:6].upper()}",
            "name": req.email.split("@")[0].replace(".", " ").title(),
            "email": req.email,
            "role": req.role or "WATERSHED_OFFICER",
            "role_title": req.role.replace("_", " ").title() if req.role else "Government Officer",
            "department": "Department of Land Resources",
            "district": "District Cell",
            "state": "State Division",
            "created_at": "2026-09-23T14:00:00Z",
        }
        OFFICERS_DB[email_clean] = officer

    return {
        **officer,
        "access_token": f"bearer-token-{uuid.uuid4().hex[:12]}",
        "token_type": "bearer",
    }

@router.post("/register", response_model=OfficerResponse, status_code=status.HTTP_201_CREATED)
def register_officer(req: RegisterRequest) -> Dict[str, Any]:
    """Register a new Government Officer account."""
    email_clean = req.email.strip().lower()
    
    if email_clean in OFFICERS_DB:
        raise HTTPException(
            status_code=400,
            detail=f"Officer account with email '{req.email}' already exists. Please sign in."
        )

    role_titles = {
        "DISTRICT_OFFICER": "District Collector / Nodal Officer",
        "WATERSHED_OFFICER": "Watershed Development Team Lead",
        "FIELD_OFFICER": "DRISHTI Field Inspector",
        "ADMIN": "System Administrator",
        "ANALYST": "Geospatial Analyst",
    }

    new_officer = {
        "id": f"OFF-{req.role[:3]}-{uuid.uuid4().hex[:4].upper()}",
        "name": req.name,
        "email": req.email,
        "role": req.role,
        "role_title": role_titles.get(req.role, req.role.replace("_", " ").title()),
        "department": req.department,
        "district": req.district,
        "state": req.state,
        "created_at": "2026-09-23T14:00:00Z",
    }

    OFFICERS_DB[email_clean] = new_officer

    return {
        **new_officer,
        "access_token": f"bearer-token-{uuid.uuid4().hex[:12]}",
        "token_type": "bearer",
    }

@router.get("/officers", response_model=List[Dict[str, Any]])
def list_registered_officers():
    """List pre-registered government officer profiles for demo quick login."""
    return list(OFFICERS_DB.values())
