import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from solver import solve_scheduling_problem
from mapper import SolverData, ObjectiveWeights

# ==============================================================================
# C2 - Unique Professor Assignment, relaxed for co-teaching offerings
# (SolverData.co_teaching_offerings)
# ==============================================================================


def _base_data(**overrides) -> SolverData:
    defaults = dict(
        professors=[1, 2],
        subject_offerings=[10],
        classrooms=[100],
        time_slots=[1001, 1002],
        time_slots_by_day={"MONDAY": [1001, 1002]},
        slot_position={1001: 1, 1002: 2},
        slot_day={1001: "MONDAY", 1002: "MONDAY"},
        valid_qualifications={(1, 10), (2, 10)},
        # Neither professor alone is available for both required slots.
        valid_availabilities={(1, 1001), (2, 1002)},
        required_time_slots={10: 2},
        expected_students={10: 30},
        classroom_capacity={100: 40},
        classroom_type={100: "COMMON"},
        required_classroom_type={10: None},
        conflicts=set(),
        objective_weights=ObjectiveWeights(alpha=1.0, beta=1.0, gamma=1.0, delta=1.0),
    )
    defaults.update(overrides)
    return SolverData(**defaults)


def test_without_co_teaching_a_single_professor_must_cover_every_lecture():
    # Regression: the normal rule still holds when the subject doesn't opt in.
    data = _base_data()

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is None, "Neither professor alone is available for both required lectures."


def test_co_teaching_allows_different_professors_across_different_lectures():
    data = _base_data(co_teaching_offerings={10})

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    assert len(response.schedule_entries) == 2
    professors_used = {e.professor_id for e in response.schedule_entries}
    assert professors_used == {1, 2}


def test_co_teaching_does_not_force_multiple_professors_when_one_suffices():
    data = _base_data(
        valid_availabilities={(1, 1001), (1, 1002)},
        co_teaching_offerings={10},
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    professors_used = {e.professor_id for e in response.schedule_entries}
    assert professors_used == {1}, "Co-teaching is allowed, not required — one professor covering everything is fine."


def test_professor_exclusivity_still_applies_to_co_teaching_offerings():
    # Both professors qualified and both available at both slots — professor
    # exclusivity (C7) must still prevent either one from double-booking.
    data = _base_data(
        valid_availabilities={(1, 1001), (1, 1002), (2, 1001), (2, 1002)},
        co_teaching_offerings={10},
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    entries_by_slot = {e.time_slot_id: e for e in response.schedule_entries}
    assert len(entries_by_slot) == 2
