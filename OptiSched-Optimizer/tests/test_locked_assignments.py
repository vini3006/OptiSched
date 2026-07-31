import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from solver import solve_scheduling_problem
from mapper import SolverData, ObjectiveWeights
from models import LockedAssignment
from validation import validate_locked_assignments_feasible, SolverDataValidationError

import pytest

# ==============================================================================
# Locked Assignments (partial regeneration — keep specific classes as-is)
# ==============================================================================


def _base_data(**overrides) -> SolverData:
    defaults = dict(
        professors=[1, 2],
        subject_offerings=[10],
        classrooms=[100, 200],
        time_slots=[1001, 1002],
        time_slots_by_day={"MONDAY": [1001, 1002]},
        slot_position={1001: 1, 1002: 2},
        slot_day={1001: "MONDAY", 1002: "MONDAY"},
        valid_qualifications={(1, 10), (2, 10)},
        valid_availabilities={(1, 1001), (1, 1002), (2, 1001), (2, 1002)},
        required_time_slots={10: 1},
        expected_students={10: 30},
        classroom_capacity={100: 40, 200: 40},
        classroom_type={100: "COMMON", 200: "COMMON"},
        required_classroom_type={10: None},
        conflicts=set(),
        objective_weights=ObjectiveWeights(alpha=1.0, beta=1.0, gamma=1.0, delta=1.0),
    )
    defaults.update(overrides)
    return SolverData(**defaults)


def test_without_locking_solver_is_free_to_choose_either_professor():
    # Sanity check for the scenario itself: with no lock, both professors are
    # equally valid, so this isn't a meaningful assertion on its own — it just
    # confirms the fixture doesn't already force a single outcome.
    data = _base_data()
    response = solve_scheduling_problem(data, debug_mode=False)
    assert response is not None
    assert response.schedule_entries[0].professor_id in (1, 2)


def test_locked_assignment_is_kept_exactly_as_is():
    data = _base_data(locked_assignments={(2, 10, 200, 1002)})

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    entry = response.schedule_entries[0]
    assert entry.professor_id == 2
    assert entry.classroom_id == 200
    assert entry.time_slot_id == 1002


def test_locked_assignment_infeasible_when_contradicting_a_hard_constraint():
    # Locks the offering to a classroom that doesn't actually have enough
    # capacity — the x variable for this tuple never gets created (domain
    # pruning), so the lock can never be satisfied and the model is
    # infeasible. The pre-solve validation is what's expected to catch this
    # in practice (see validate_locked_assignments_feasible tests below);
    # this test just confirms the solver-level behavior if it were skipped.
    data = _base_data(
        expected_students={10: 999},
        locked_assignments={(2, 10, 200, 1002)},
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is None


# ------------------------------------------------------------------
# validate_locked_assignments_feasible
# ------------------------------------------------------------------

_VALID_QUALIFICATIONS = {(1, 10)}
_VALID_AVAILABILITIES = {(1, 1001)}
_CLASSROOM_CAPACITY = {100: 40}
_CLASSROOM_TYPE = {100: "COMMON"}
_REQUIRED_CLASSROOM_TYPE = {10: None}
_EXPECTED_STUDENTS = {10: 30}


def _locked(professor_id=1, offering_id=10, classroom_id=100, time_slot_id=1001):
    return LockedAssignment(
        professor_id=professor_id,
        subject_offering_id=offering_id,
        classroom_id=classroom_id,
        time_slot_id=time_slot_id,
    )


def _validate(locked_assignments):
    validate_locked_assignments_feasible(
        locked_assignments=locked_assignments,
        valid_qualifications=_VALID_QUALIFICATIONS,
        valid_availabilities=_VALID_AVAILABILITIES,
        classroom_capacity=_CLASSROOM_CAPACITY,
        classroom_type=_CLASSROOM_TYPE,
        required_classroom_type=_REQUIRED_CLASSROOM_TYPE,
        expected_students=_EXPECTED_STUDENTS,
    )


def test_valid_locked_assignment_passes():
    _validate([_locked()])


def test_rejects_when_professor_no_longer_qualified():
    with pytest.raises(SolverDataValidationError, match="no longer qualified"):
        _validate([_locked(professor_id=2)])


def test_rejects_when_professor_no_longer_available():
    with pytest.raises(SolverDataValidationError, match="no longer available"):
        _validate([_locked(time_slot_id=9999)])


def test_rejects_when_classroom_no_longer_has_capacity():
    with pytest.raises(SolverDataValidationError, match="enough capacity"):
        validate_locked_assignments_feasible(
            locked_assignments=[_locked()],
            valid_qualifications=_VALID_QUALIFICATIONS,
            valid_availabilities=_VALID_AVAILABILITIES,
            classroom_capacity=_CLASSROOM_CAPACITY,
            classroom_type=_CLASSROOM_TYPE,
            required_classroom_type=_REQUIRED_CLASSROOM_TYPE,
            expected_students={10: 999},
        )


def test_rejects_when_classroom_type_no_longer_matches():
    with pytest.raises(SolverDataValidationError, match="no longer a LABORATORY room"):
        validate_locked_assignments_feasible(
            locked_assignments=[_locked()],
            valid_qualifications=_VALID_QUALIFICATIONS,
            valid_availabilities=_VALID_AVAILABILITIES,
            classroom_capacity=_CLASSROOM_CAPACITY,
            classroom_type=_CLASSROOM_TYPE,
            required_classroom_type={10: "LABORATORY"},
            expected_students=_EXPECTED_STUDENTS,
        )
