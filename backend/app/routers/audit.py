"""
audit.py
========
Router for Government Audit Trail retrieval and action logging.
"""

from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Query
from ..services.audit import get_audit_service
from ..services.models import AuditLogEntry

router = APIRouter(prefix="/audit", tags=["Audit Trail"])


@router.get("", response_model=List[AuditLogEntry])
def get_audit_logs(
    user_id: Optional[str] = Query(None, description="Filter by User ID"),
    action: Optional[str] = Query(None, description="Filter by Action Type"),
    entity: Optional[str] = Query(None, description="Filter by Entity Type"),
    limit: int = Query(100, ge=1, le=500, description="Max entries")
) -> List[AuditLogEntry]:
    audit_service = get_audit_service()
    return audit_service.get_entries(user_id=user_id, action=action, entity=entity, limit=limit)
