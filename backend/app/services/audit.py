"""
audit.py
========
Audit Trail service for logging actions, user operations, analysis execution,
and evidence submissions.
"""

from __future__ import annotations

import json
import os
import time
import uuid
from typing import Any, Dict, List, Optional
from .models import AuditLogEntry
from ..config import settings


class AuditService:
    def __init__(self, log_path: Optional[str] = None):
        self.log_path = log_path or settings.audit_log_path
        self._entries: List[AuditLogEntry] = []
        self._load()

    def _load(self) -> None:
        if os.path.exists(self.log_path):
            try:
                with open(self.log_path, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                    self._entries = [AuditLogEntry(**item) for item in raw]
                return
            except Exception as exc:
                print(f"[audit] Failed to load audit logs: {exc}")
        
        # Seed initial system audit logs if empty
        self._seed_default_logs()

    def _save(self) -> None:
        try:
            os.makedirs(os.path.dirname(self.log_path), exist_ok=True)
            with open(self.log_path, "w", encoding="utf-8") as f:
                json.dump([item.model_dump() for item in self._entries], f, indent=2)
        except Exception as exc:
            print(f"[audit] Failed to save audit logs: {exc}")

    def _seed_default_logs(self) -> None:
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        self._entries = [
            AuditLogEntry(
                id=str(uuid.uuid4()),
                timestamp=now,
                user_id="sys_admin",
                role="ADMIN",
                action="DATASET_INGESTION",
                entity="Watershed",
                entity_id="watershed_001",
                old_value=None,
                new_value="Sample Dataset Ingested",
                details={"interventions": 10, "photos": 22}
            ),
            AuditLogEntry(
                id=str(uuid.uuid4()),
                timestamp=now,
                user_id="officer_mh_01",
                role="WATERSHED_OFFICER",
                action="ANALYSIS_RUN",
                entity="Intervention",
                entity_id="INT-PT-003",
                old_value=None,
                new_value="Impact 69.7 Score Derived",
                details={"confidence": "High", "land_ndvi_delta": 0.072}
            )
        ]
        self._save()

    def log(
        self,
        user_id: str,
        role: str,
        action: str,
        entity: str,
        entity_id: str,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> AuditLogEntry:
        entry = AuditLogEntry(
            id=f"AUD-{uuid.uuid4().hex[:8].upper()}",
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            user_id=user_id,
            role=role,
            action=action,
            entity=entity,
            entity_id=entity_id,
            old_value=old_value,
            new_value=new_value,
            details=details or {}
        )
        self._entries.insert(0, entry)  # latest first
        self._save()
        return entry

    def get_entries(
        self,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        entity: Optional[str] = None,
        limit: int = 100
    ) -> List[AuditLogEntry]:
        results = self._entries
        if user_id:
            results = [e for e in results if e.user_id.lower() == user_id.lower()]
        if action:
            results = [e for e in results if e.action.lower() == action.lower()]
        if entity:
            results = [e for e in results if e.entity.lower() == entity.lower()]
        return results[:limit]


_audit_service_instance: Optional[AuditService] = None

def get_audit_service() -> AuditService:
    global _audit_service_instance
    if _audit_service_instance is None:
        _audit_service_instance = AuditService()
    return _audit_service_instance
