import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

import api.optimization as optimization_module
from api.optimization import MAX_SOLVER_TIME_LIMIT_SECONDS, verify_internal_key
from models import OptimizationRequest, OptimizationResponse

# ==============================================================================
# verify_internal_key (A3 — X-Internal-Key header)
# ==============================================================================


def test_verify_internal_key_rejects_when_not_configured(monkeypatch):
    monkeypatch.setattr(optimization_module, "OPTIMIZER_INTERNAL_KEY", None)

    with pytest.raises(HTTPException) as exc_info:
        verify_internal_key(x_internal_key="anything")

    assert exc_info.value.status_code == 401


def test_verify_internal_key_rejects_missing_header(monkeypatch):
    monkeypatch.setattr(optimization_module, "OPTIMIZER_INTERNAL_KEY", "dev-secret")

    with pytest.raises(HTTPException) as exc_info:
        verify_internal_key(x_internal_key=None)

    assert exc_info.value.status_code == 401


def test_verify_internal_key_rejects_wrong_header(monkeypatch):
    monkeypatch.setattr(optimization_module, "OPTIMIZER_INTERNAL_KEY", "dev-secret")

    with pytest.raises(HTTPException) as exc_info:
        verify_internal_key(x_internal_key="wrong-value")

    assert exc_info.value.status_code == 401


def test_verify_internal_key_accepts_matching_header(monkeypatch):
    monkeypatch.setattr(optimization_module, "OPTIMIZER_INTERNAL_KEY", "dev-secret")

    verify_internal_key(x_internal_key="dev-secret")  # must not raise


# ==============================================================================
# solver_time_limit_seconds clamp (A3 — MAX_SOLVER_TIME_LIMIT_SECONDS)
# ==============================================================================


def _empty_request(**overrides) -> OptimizationRequest:
    defaults = dict(professors=[], subject_offerings=[], classrooms=[], time_slots=[])
    defaults.update(overrides)
    return OptimizationRequest(**defaults)


def _stub_solver(monkeypatch, captured: dict):
    def fake_solve(data, debug_mode=False, time_limit_seconds=None, diagnostics=None):
        captured["time_limit_seconds"] = time_limit_seconds
        return OptimizationResponse(schedule_entries=[])

    monkeypatch.setattr(optimization_module, "build_solver_data", lambda request: object())
    monkeypatch.setattr(optimization_module, "solve_scheduling_problem", fake_solve)


def test_optimize_clamps_time_limit_above_the_ceiling(monkeypatch):
    captured: dict = {}
    _stub_solver(monkeypatch, captured)

    optimization_module.optimize(_empty_request(solver_time_limit_seconds=9999.0))

    assert captured["time_limit_seconds"] == MAX_SOLVER_TIME_LIMIT_SECONDS


def test_optimize_passes_through_time_limit_within_the_ceiling(monkeypatch):
    captured: dict = {}
    _stub_solver(monkeypatch, captured)

    optimization_module.optimize(_empty_request(solver_time_limit_seconds=30.0))

    assert captured["time_limit_seconds"] == 30.0


def test_optimize_leaves_unset_time_limit_as_none(monkeypatch):
    captured: dict = {}
    _stub_solver(monkeypatch, captured)

    optimization_module.optimize(_empty_request())

    assert captured["time_limit_seconds"] is None


# ==============================================================================
# OptimizationRequest list size caps (A3 — Field(max_length=...))
# ==============================================================================


def test_preferred_time_slot_ids_rejects_oversized_list():
    with pytest.raises(ValidationError):
        _empty_request(preferred_time_slot_ids=list(range(501)))


def test_preferred_time_slot_ids_accepts_list_at_the_cap():
    request = _empty_request(preferred_time_slot_ids=list(range(500)))
    assert len(request.preferred_time_slot_ids) == 500
