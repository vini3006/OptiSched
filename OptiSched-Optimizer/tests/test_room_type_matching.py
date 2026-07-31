import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from solver import solve_scheduling_problem
from mapper import SolverData, ObjectiveWeights

# ==============================================================================
# C8 - Room Type Matching (domain pruning in variables.py)
# ==============================================================================


def _base_data(**overrides) -> SolverData:
    defaults = dict(
        professors=[1],
        subject_offerings=[10],
        classrooms=[100, 200],
        time_slots=[1001, 1002],
        time_slots_by_day={"MONDAY": [1001, 1002]},
        slot_position={1001: 1, 1002: 2},
        slot_day={1001: "MONDAY", 1002: "MONDAY"},
        valid_qualifications={(1, 10)},
        valid_availabilities={(1, 1001), (1, 1002)},
        required_time_slots={10: 1},
        expected_students={10: 30},
        classroom_capacity={100: 40, 200: 40},
        classroom_type={100: "COMMON", 200: "LABORATORY"},
        required_classroom_type={10: None},
        conflicts=set(),
        objective_weights=ObjectiveWeights(alpha=1.0, beta=1.0, gamma=1.0, delta=1.0),
    )
    defaults.update(overrides)
    return SolverData(**defaults)


def test_no_preference_can_use_either_room_type():
    data = _base_data(required_classroom_type={10: None})

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    assert len(response.schedule_entries) == 1


def test_offering_is_scheduled_only_in_the_matching_room_type():
    data = _base_data(required_classroom_type={10: "LABORATORY"})

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    assert response.schedule_entries[0].classroom_id == 200


def test_infeasible_when_no_classroom_of_the_required_type_exists():
    # Only a COMMON room (100) is big enough/exists — offering needs a LAB.
    data = _base_data(
        classrooms=[100],
        classroom_capacity={100: 40},
        classroom_type={100: "COMMON"},
        required_classroom_type={10: "LABORATORY"},
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is None, "No LABORATORY room exists, so this must be infeasible."
