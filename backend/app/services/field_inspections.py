"""
field_inspections.py
====================
Service managing government field inspection workflows, photo submissions,
and status updates.
"""

from __future__ import annotations

import json
import os
import time
import uuid
from typing import Any, Dict, List, Optional
from .models import FieldInspectionTask, InspectionStatus, UserRole
from ..config import settings


class FieldInspectionService:
    def __init__(self, data_path: Optional[str] = None):
        self.data_path = data_path or settings.field_inspections_path
        self._tasks: List[FieldInspectionTask] = []
        self._load()

    def _load(self) -> None:
        if os.path.exists(self.data_path):
            try:
                with open(self.data_path, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                    self._tasks = [FieldInspectionTask(**item) for item in raw]
                return
            except Exception as exc:
                print(f"[inspections] Failed to load tasks: {exc}")
        
        self._seed_default_tasks()

    def _save(self) -> None:
        try:
            os.makedirs(os.path.dirname(self.data_path), exist_ok=True)
            with open(self.data_path, "w", encoding="utf-8") as f:
                json.dump([task.model_dump() for task in self._tasks], f, indent=2)
        except Exception as exc:
            print(f"[inspections] Failed to save tasks: {exc}")

    def _seed_default_tasks(self) -> None:
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        self._tasks = [
            FieldInspectionTask(
                id="INSP-001",
                intervention_id="INT-CD-001",
                watershed_id="watershed_001",
                reason="NDVI response below expected threshold; verify siltation & structural integrity.",
                priority="HIGH",
                assigned_officer="Field_Officer_Parner",
                assigned_role=UserRole.FIELD_OFFICER,
                due_date="2026-10-15",
                required_evidence=["Upstream ponding photo", "Check dam spillway photo", "GPS coordinate verification"],
                status=InspectionStatus.REQUESTED,
                created_at=now,
                created_by="officer_district_01"
            ),
            FieldInspectionTask(
                id="INSP-002",
                intervention_id="INT-PT-003",
                watershed_id="watershed_001",
                reason="Routine post-monsoon verification of water impoundment area.",
                priority="MEDIUM",
                assigned_officer="Field_Officer_North",
                assigned_role=UserRole.FIELD_OFFICER,
                due_date="2026-11-01",
                required_evidence=["Percolation tank basin photo"],
                status=InspectionStatus.SUBMITTED,
                created_at=now,
                created_by="officer_district_01",
                submitted_at=now,
                submitted_photos=["IMG_0042.jpg"],
                field_notes="Structure intact with active percolation and 15% basin water coverage.",
                gps_verified=True
            )
        ]
        self._save()

    def list_tasks(
        self,
        watershed_id: Optional[str] = None,
        intervention_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[FieldInspectionTask]:
        res = self._tasks
        if watershed_id:
            res = [t for t in res if t.watershed_id == watershed_id]
        if intervention_id:
            res = [t for t in res if t.intervention_id == intervention_id]
        if status:
            res = [t for t in res if t.status.value.lower() == status.lower()]
        return res

    def create_task(
        self,
        intervention_id: str,
        watershed_id: str,
        reason: str,
        assigned_officer: str,
        due_date: str,
        priority: str = "HIGH",
        required_evidence: Optional[List[str]] = None,
        created_by: str = "District_Officer"
    ) -> FieldInspectionTask:
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        task = FieldInspectionTask(
            id=f"INSP-{uuid.uuid4().hex[:6].upper()}",
            intervention_id=intervention_id,
            watershed_id=watershed_id,
            reason=reason,
            priority=priority,
            assigned_officer=assigned_officer,
            assigned_role=UserRole.FIELD_OFFICER,
            due_date=due_date,
            required_evidence=required_evidence or ["Geo-coded photo", "Field observations"],
            status=InspectionStatus.REQUESTED,
            created_at=now,
            created_by=created_by
        )
        self._tasks.insert(0, task)
        self._save()
        return task

    def update_task_status(
        self,
        task_id: str,
        status: InspectionStatus,
        field_notes: Optional[str] = None,
        submitted_photos: Optional[List[str]] = None,
        gps_verified: bool = False
    ) -> Optional[FieldInspectionTask]:
        for task in self._tasks:
            if task.id == task_id:
                task.status = status
                if field_notes:
                    task.field_notes = field_notes
                if submitted_photos:
                    task.submitted_photos = submitted_photos
                task.gps_verified = gps_verified
                if status in (InspectionStatus.SUBMITTED, InspectionStatus.VALIDATED):
                    task.submitted_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                self._save()
                return task
        return None


_inspection_service_instance: Optional[FieldInspectionService] = None

def get_field_inspection_service() -> FieldInspectionService:
    global _inspection_service_instance
    if _inspection_service_instance is None:
        _inspection_service_instance = FieldInspectionService()
    return _inspection_service_instance
