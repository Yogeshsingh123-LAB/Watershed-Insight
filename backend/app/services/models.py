"""
models.py
=========
Pydantic schemas and dataclasses for government decision support,
data sources, evidence health, intervention lifecycle, field inspection,
audit logs, and AI explanation layers.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    DISTRICT_OFFICER = "DISTRICT_OFFICER"
    WATERSHED_OFFICER = "WATERSHED_OFFICER"
    FIELD_OFFICER = "FIELD_OFFICER"
    ANALYST = "ANALYST"


class UserProfile(BaseModel):
    user_id: str
    name: str
    role: UserRole
    department: str = "Department of Land Resources (DoLR)"
    district: Optional[str] = None
    state: str = "Maharashtra"


class SourceStatus(str, Enum):
    CONNECTED = "CONNECTED"
    DEMO_DATA = "DEMO_DATA"
    NOT_CONFIGURED = "NOT_CONFIGURED"


class DataSourceInfo(BaseModel):
    id: str
    name: str
    type: str
    status: SourceStatus
    last_synced: Optional[str] = None
    item_count: int = 0
    description: str
    is_synthetic: bool = True
    details: Dict[str, Any] = Field(default_factory=dict)


class DataSourcesOverview(BaseModel):
    mode: str = "DEMO"
    sources: List[DataSourceInfo]
    total_watersheds: int = 0
    total_interventions: int = 0
    total_photos: int = 0
    last_updated: str


class LifecycleStatus(str, Enum):
    PLANNED = "PLANNED"
    APPROVED = "APPROVED"
    UNDER_IMPLEMENTATION = "UNDER_IMPLEMENTATION"
    COMPLETED = "COMPLETED"
    MONITORING = "MONITORING"
    IMPACT_ASSESSED = "IMPACT_ASSESSED"
    ACTION_REQUIRED = "ACTION_REQUIRED"


class TimelineEvent(BaseModel):
    event_id: str
    timestamp: str
    title: str
    event_type: str
    source: str
    description: str
    evidence_ref: Optional[str] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)


class BeforeAfterComparison(BaseModel):
    intervention_id: str
    intervention_name: str
    structure_type: str
    t0_date: str
    t1_date: str
    buffer_radius_m: int = 250
    before_metrics: Dict[str, Any]
    after_metrics: Dict[str, Any]
    change_metrics: Dict[str, Any]
    photos: List[Dict[str, Any]] = Field(default_factory=list)
    satellite_overlays: Dict[str, str] = Field(default_factory=dict)


class EvidenceCheckItem(BaseModel):
    key: str
    label: str
    passed: bool
    weight: float = 1.0
    reason: str
    details: Dict[str, Any] = Field(default_factory=dict)


class EvidenceHealthReport(BaseModel):
    intervention_id: str
    health_score: float  # 0 to 100
    status_label: str  # EXCELLENT, ACCEPTABLE, WEAK, DEFICIENT
    checks: List[EvidenceCheckItem]
    warnings: List[str]
    missing_requirements: List[str]
    recommendation: str


class ImpactBreakdown(BaseModel):
    vegetation_score: float  # out of 40
    water_score: float  # out of 40
    extent_score: float  # out of 20
    total_impact_score: float  # out of 100
    land_ndvi_delta: float
    water_area_gain_ha: float
    improved_pct: float
    net_difference_vs_control: float
    control_percentile: float


class ConfidenceBreakdown(BaseModel):
    cloud_free_coverage_pct: float
    epoch_availability_score: float
    season_match_score: float
    photo_evidence_score: float
    buffer_coverage_score: float
    baseline_availability_score: float
    total_confidence_score: float  # out of 100
    confidence_label: str  # High, Moderate, Low, Inconclusive


class EnvironmentalContext(BaseModel):
    watershed_id: str
    season_t0: str
    season_t1: str
    annual_rainfall_mm: Optional[float] = None
    rainfall_status: str = "Unavailable"  # Available, Unavailable
    observation_quality: str = "Cloud-free baseline"
    cloud_cover_pct: float = 0.0
    disclaimer: str = "Rainfall and seasonal variability may influence observed changes."


class InspectionStatus(str, Enum):
    REQUESTED = "REQUESTED"
    ASSIGNED = "ASSIGNED"
    SUBMITTED = "SUBMITTED"
    VALIDATED = "VALIDATED"
    ANALYSIS_UPDATED = "ANALYSIS_UPDATED"


class FieldInspectionTask(BaseModel):
    id: str
    intervention_id: str
    watershed_id: str
    reason: str
    priority: str = "HIGH"  # HIGH, MEDIUM, LOW
    assigned_officer: str
    assigned_role: UserRole = UserRole.FIELD_OFFICER
    due_date: str
    required_evidence: List[str] = Field(default_factory=list)
    status: InspectionStatus = InspectionStatus.REQUESTED
    created_at: str
    created_by: str
    submitted_at: Optional[str] = None
    submitted_photos: List[str] = Field(default_factory=list)
    field_notes: Optional[str] = None
    gps_verified: bool = False


class AuditLogEntry(BaseModel):
    id: str
    timestamp: str
    user_id: str
    role: str
    action: str
    entity: str
    entity_id: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    analysis_version: str = "1.0.0"
    dataset_version: str = "sample_v1"
    details: Dict[str, Any] = Field(default_factory=dict)


class ActionQueueItem(BaseModel):
    id: str
    intervention_id: str
    intervention_name: str
    structure_type: str
    watershed_id: str
    priority: str  # HIGH, MEDIUM, LOW
    action_type: str
    title: str
    reason_why: str
    evidence_summary: str
    suggested_role: UserRole


class DecisionCenterSummary(BaseModel):
    watershed_id: str
    watershed_name: str
    overall_health: str  # Good, Moderate, Degraded
    total_structures: int
    high_impact_count: int
    moderate_impact_count: int
    inspection_required_count: int
    inconclusive_count: int
    average_impact_score: float
    average_confidence_score: float
    action_queue: List[ActionQueueItem]
    updated_at: str


class AiExplanationRequest(BaseModel):
    watershed_id: str
    intervention_id: Optional[str] = None
    aspect: str = "general"


class AiExplanationResponse(BaseModel):
    summary: str
    key_observations: List[str]
    supporting_evidence: List[str]
    uncertainty_notes: List[str]
    recommended_action: str
    citation_sources: List[str]
    disclaimer: str = "AI-generated explanation based strictly on computed geospatial evidence."


class AiQueryRequest(BaseModel):
    watershed_id: str
    prompt: str


class AiQueryResponse(BaseModel):
    answer: str
    supporting_sources: List[str]
    evidence_metrics: Dict[str, Any] = Field(default_factory=dict)
    disclaimer: str = "AI response strictly constrained to computed geospatial evidence."
