import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from solver import solve_scheduling_problem
from mapper import SolverData, ObjectiveWeights

# ==============================================================================
# Configurable time limit + solve diagnostics (additive to solve_scheduling_problem)
# ==============================================================================


def _base_data(**overrides) -> SolverData:
    defaults = dict(
        professors=[1],
        subject_offerings=[10],
        classrooms=[100],
        time_slots=[1001, 1002],
        time_slots_by_day={"MONDAY": [1001, 1002]},
        slot_position={1001: 1, 1002: 2},
        slot_day={1001: "MONDAY", 1002: "MONDAY"},
        valid_qualifications={(1, 10)},
        valid_availabilities={(1, 1001), (1, 1002)},
        required_time_slots={10: 2},
        expected_students={10: 30},
        classroom_capacity={100: 40},
        conflicts=set(),
        objective_weights=ObjectiveWeights(alpha=1.0, beta=1.0, gamma=1.0, delta=1.0),
    )
    defaults.update(overrides)
    return SolverData(**defaults)


def test_default_behavior_is_unchanged_when_new_params_are_omitted():
    data = _base_data()

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    assert len(response.schedule_entries) == 2


def test_custom_time_limit_still_solves_a_feasible_problem():
    data = _base_data()

    response = solve_scheduling_problem(data, debug_mode=False, time_limit_seconds=5.0)

    assert response is not None


def test_diagnostics_dict_is_populated_on_success():
    data = _base_data()
    diagnostics: dict = {}

    response = solve_scheduling_problem(data, debug_mode=False, diagnostics=diagnostics)

    assert response is not None
    assert diagnostics["hit_time_limit"] is False
    assert "model_status" in diagnostics


def test_diagnostics_dict_reports_no_time_limit_hit_for_a_quickly_proven_infeasibility():
    # Demand (3) > raw availability (2) — HiGHS should detect this as
    # infeasible well before any time budget is exhausted.
    data = _base_data(required_time_slots={10: 3})
    diagnostics: dict = {}

    response = solve_scheduling_problem(data, debug_mode=False, diagnostics=diagnostics)

    assert response is None
    assert diagnostics["hit_time_limit"] is False
