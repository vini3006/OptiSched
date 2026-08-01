import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from solver import solve_scheduling_problem
from mapper import SolverData, ObjectiveWeights

# ==============================================================================
# Per-course mandatory shift (domain pruning in variables.py, mirrors C8's
# room-type pruning) — SolverData.allowed_time_slots
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
        required_time_slots={10: 1},
        expected_students={10: 30},
        classroom_capacity={100: 40},
        classroom_type={100: "COMMON"},
        required_classroom_type={10: None},
        conflicts=set(),
        objective_weights=ObjectiveWeights(alpha=1.0, beta=1.0, gamma=1.0, delta=1.0),
    )
    defaults.update(overrides)
    return SolverData(**defaults)


def test_no_restriction_can_use_any_time_slot():
    data = _base_data()

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    assert len(response.schedule_entries) == 1


def test_offering_is_scheduled_only_within_its_allowed_time_slots():
    data = _base_data(allowed_time_slots={10: {1002}})

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    assert response.schedule_entries[0].time_slot_id == 1002


def test_infeasible_when_the_allowed_window_has_no_room_for_the_weekly_requirement():
    # Needs 2 lectures/week, but the course's mandatory shift only overlaps
    # one TimeSlot — structurally infeasible regardless of professor/room.
    data = _base_data(
        required_time_slots={10: 2},
        allowed_time_slots={10: {1002}},
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is None, "Only 1 allowed slot exists but 2 lectures/week are required."


def test_other_offerings_are_unaffected_by_one_offerings_restriction():
    data = _base_data(
        subject_offerings=[10, 20],
        valid_qualifications={(1, 10), (1, 20)},
        required_time_slots={10: 1, 20: 1},
        expected_students={10: 30, 20: 30},
        required_classroom_type={10: None, 20: None},
        allowed_time_slots={10: {1001}},
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    entries_by_offering = {e.subject_offering_id: e for e in response.schedule_entries}
    assert entries_by_offering[10].time_slot_id == 1001
    assert entries_by_offering[20].time_slot_id in {1001, 1002}
