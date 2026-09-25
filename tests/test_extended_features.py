"""
test_extended_features.py
==========================
Automated unit tests for extended platform capabilities:
- Data sources status
- Field inspection workflows
- Audit logging
- AI explanation & prompt query layer
- Intervention timeline & Before/After comparison
- Evidence health validation
- Decision Center summary
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_data_sources():
    res = client.get("/api/v1/data-sources")
    assert res.status_code == 200
    data = res.json()
    assert "mode" in data
    assert len(data["sources"]) == 4
    assert data["total_watersheds"] >= 2


def test_field_inspections_lifecycle():
    # 1. List initial tasks
    res = client.get("/api/v1/field-inspections")
    assert res.status_code == 200
    initial_tasks = res.json()
    assert len(initial_tasks) >= 1

    # 2. Create new task
    create_payload = {
        "intervention_id": "INT-PT-003",
        "watershed_id": "watershed_001",
        "reason": "Test inspection request",
        "assigned_officer": "Test_Officer",
        "due_date": "2026-12-01",
        "priority": "HIGH"
    }
    create_res = client.post("/api/v1/field-inspections", json=create_payload)
    assert create_res.status_code == 200
    new_task = create_res.json()
    assert new_task["intervention_id"] == "INT-PT-003"
    assert new_task["status"] == "REQUESTED"

    # 3. Update task status
    task_id = new_task["id"]
    update_res = client.patch(
        f"/api/v1/field-inspections/{task_id}",
        json={"status": "SUBMITTED", "field_notes": "All checks verified", "gps_verified": True}
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["status"] == "SUBMITTED"
    assert updated["field_notes"] == "All checks verified"


def test_audit_logs():
    res = client.get("/api/v1/audit")
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) >= 1
    assert "timestamp" in logs[0]
    assert "action" in logs[0]


def test_ai_explanation_and_query():
    # Explain endpoint
    exp_res = client.post(
        "/api/v1/ai/explain",
        json={"watershed_id": "watershed_001", "intervention_id": "INT-PT-003"}
    )
    assert exp_res.status_code == 200
    exp_data = exp_res.json()
    assert "summary" in exp_data
    assert len(exp_data["key_observations"]) > 0

    # Query endpoint
    query_res = client.post(
        "/api/v1/ai/query",
        json={"watershed_id": "watershed_001", "prompt": "Which interventions require inspection?"}
    )
    assert query_res.status_code == 200
    query_data = query_res.json()
    assert "answer" in query_data
    assert len(query_data["supporting_sources"]) > 0


def test_timeline_and_before_after():
    # Timeline
    tl_res = client.get("/api/v1/interventions/INT-PT-003/timeline")
    assert tl_res.status_code == 200
    tl_data = tl_res.json()
    assert len(tl_data["events"]) >= 2

    # Before/After
    ba_res = client.get("/api/v1/interventions/INT-PT-003/before-after")
    assert ba_res.status_code == 200
    ba_data = ba_res.json()
    assert "before_metrics" in ba_data
    assert "after_metrics" in ba_data
    assert "change_metrics" in ba_data


def test_evidence_health_and_decision_summary():
    # Evidence Health
    eh_res = client.get("/api/v1/interventions/INT-PT-003/evidence-health")
    assert eh_res.status_code == 200
    eh_data = eh_res.json()
    assert "health_score" in eh_data
    assert len(eh_data["checks"]) >= 5

    # Decision Summary
    ds_res = client.get("/api/v1/watersheds/watershed_001/decision-summary")
    assert ds_res.status_code == 200
    ds_data = ds_res.json()
    assert "action_queue" in ds_data
    assert "overall_health" in ds_data
