import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from solver import solve_scheduling_problem
from mapper import SolverData, ObjectiveWeights

# ==============================================================================
# C17 - Same-Offering Daily Contiguity (hard)
# ==============================================================================
#
# If a SubjectOffering has more than one lecture on the same day, those
# lectures must be scheduled back-to-back — no gap in between. This is a
# hard guarantee, independent of the soft S3/gamma weight (which only
# rewards blocking when it happens to occur, but never forces it).
# ==============================================================================


def _base_data(**overrides) -> SolverData:
    defaults = dict(
        professors=[1],
        subject_offerings=[10],
        classrooms=[100],
        time_slots=[1001, 1002, 1003],
        time_slots_by_day={"MONDAY": [1001, 1002, 1003]},
        slot_position={1001: 1, 1002: 2, 1003: 3},
        slot_day={1001: "MONDAY", 1002: "MONDAY", 1003: "MONDAY"},
        valid_qualifications={(1, 10)},
        valid_availabilities={(1, 1001), (1, 1002), (1, 1003)},
        required_time_slots={10: 2},
        expected_students={10: 30},
        classroom_capacity={100: 40},
        classroom_type={100: "COMMON"},
        required_classroom_type={10: None},
        conflicts=set(),
        # All weights zeroed on purpose: any contiguity observed in these
        # tests must come from the hard constraint, not from the soft
        # S3/gamma objective pressure.
        objective_weights=ObjectiveWeights(alpha=0.0, beta=0.0, gamma=0.0, delta=0.0),
    )
    defaults.update(overrides)
    return SolverData(**defaults)


def test_infeasible_when_the_only_option_leaves_a_gap():
    # The professor is only available at the first and last slot of the
    # day (1001 and 1003) — the middle slot (1002) is off the table. With
    # exactly 2 required sessions, the only mathematically possible
    # placement is {1001, 1003}, which is a gapped (non-contiguous)
    # pattern. C17 must reject it.
    data = _base_data(valid_availabilities={(1, 1001), (1, 1003)})

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is None


def test_feasible_contiguous_pair_is_accepted():
    data = _base_data(valid_availabilities={(1, 1001), (1, 1002)})

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    scheduled_slots = sorted(entry.time_slot_id for entry in response.schedule_entries)
    assert scheduled_slots == [1001, 1002]


def test_full_day_block_of_three_sessions_is_accepted():
    data = _base_data(required_time_slots={10: 3})

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    scheduled_slots = sorted(entry.time_slot_id for entry in response.schedule_entries)
    assert scheduled_slots == [1001, 1002, 1003]


def test_sessions_on_different_days_are_not_affected():
    # C17 is scoped to a single day — one session on Monday and one on
    # Tuesday is not a "gap" in any meaningful sense, and must stay
    # feasible.
    data = _base_data(
        time_slots=[1001, 2001],
        time_slots_by_day={"MONDAY": [1001], "TUESDAY": [2001]},
        slot_position={1001: 1, 2001: 1},
        slot_day={1001: "MONDAY", 2001: "TUESDAY"},
        valid_availabilities={(1, 1001), (1, 2001)},
        required_time_slots={10: 2},
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    assert len(response.schedule_entries) == 2
