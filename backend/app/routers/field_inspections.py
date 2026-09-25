"""
field_inspections.py
====================
Router for government field inspection workflows and task assignments.
"""

from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from ..services.field_inspections import get_field_inspection_service
from ..services.audit import get_audit_service
from ..services.models import FieldInspectionTask, InspectionStatus

router = APIRouter(prefix="/field-inspections", tags=["Field Inspections"])


class CreateInspectionRequest(BaseModel):
    intervention_id: str
    watershed_id: str
    reason: str
    assigned_officer: str = "Field_Officer_District"
    due_date: str = "2026-11-15"
    priority: str = "HIGH"
    required_evidence: Optional[List[str]] = None


class UpdateInspectionStatusRequest(BaseModel):
    status: InspectionStatus
    field_notes: Optional[str] = None
    submitted_photos: Optional[List[str]] = None
    gps_verified: bool = True


@router.get("", response_model=List[FieldInspectionTask])
def list_field_inspections(
    watershed_id: Optional[str] = None,
    intervention_id: Optional[str] = None,
    status: Optional[str] = None
) -> List[FieldInspectionTask]:
    service = get_field_inspection_service()
    return service.list_tasks(watershed_id=watershed_id, intervention_id=intervention_id, status=status)


@router.post("", response_model=FieldInspectionTask)
def create_field_inspection(req: CreateInspectionRequest) -> FieldInspectionTask:
    service = get_field_inspection_service()
    audit = get_audit_service()
    task = service.create_task(
        intervention_id=req.intervention_id,
        watershed_id=req.watershed_id,
        reason=req.reason,
        assigned_officer=req.assigned_officer,
        due_date=req.due_date,
        priority=req.priority,
        required_evidence=req.required_evidence
    )
    audit.log(
        user_id="district_officer_01",
        role="DISTRICT_OFFICER",
        action="CREATE_FIELD_INSPECTION",
        entity="FieldInspection",
        entity_id=task.id,
        new_value=task.status.value,
        details={"intervention_id": req.intervention_id, "reason": req.reason}
    )
    return task


@router.patch("/{id}", response_model=FieldInspectionTask)
def update_field_inspection(id: str, req: UpdateInspectionStatusRequest) -> FieldInspectionTask:
    service = get_field_inspection_service()
    audit = get_audit_service()
    updated = service.update_task_status(
        task_id=id,
        status=req.status,
        field_notes=req.field_notes,
        submitted_photos=req.submitted_photos,
        gps_verified=req.gps_verified
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"Field inspection task '{id}' not found")

    audit.log(
        user_id="field_officer_01",
        role="FIELD_OFFICER",
        action="UPDATE_FIELD_INSPECTION",
        entity="FieldInspection",
        entity_id=id,
        new_value=req.status.value,
        details={"notes": req.field_notes, "photos": req.submitted_photos}
    )
    return updated
