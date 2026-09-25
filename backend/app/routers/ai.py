"""
ai.py
=====
Router for evidence-bounded AI explanations and prompt queries.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from ..services.store import get_store, WatershedNotFound
from ..services.ai_explainer import AiExplainerService
from ..services.models import (
    AiExplanationRequest,
    AiExplanationResponse,
    AiQueryRequest,
    AiQueryResponse,
)

router = APIRouter(prefix="/ai", tags=["AI Explanation Layer"])


@router.post("/explain", response_model=AiExplanationResponse)
def explain_evidence(req: AiExplanationRequest) -> AiExplanationResponse:
    store = get_store()
    try:
        ws_summary = store.watershed_summary(req.watershed_id)
    except WatershedNotFound:
        raise HTTPException(status_code=404, detail=f"Watershed '{req.watershed_id}' not found")

    intervention_analysis = None
    if req.intervention_id:
        try:
            intervention_analysis = store.intervention_analysis(req.intervention_id)
        except Exception:
            pass

    return AiExplainerService.explain_evidence(ws_summary, intervention_analysis)


@router.post("/query", response_model=AiQueryResponse)
def query_evidence(req: AiQueryRequest) -> AiQueryResponse:
    store = get_store()
    try:
        ws_summary = store.watershed_summary(req.watershed_id)
    except WatershedNotFound:
        raise HTTPException(status_code=404, detail=f"Watershed '{req.watershed_id}' not found")

    return AiExplainerService.query_evidence(req.prompt, ws_summary)
