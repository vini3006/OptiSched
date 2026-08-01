import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from solver import solve_scheduling_problem
from mapper import SolverData, ObjectiveWeights

# ==============================================================================
# C16 - Daily Classroom Stability (hard)
# ==============================================================================
#
# Once a SubjectOffering has been placed in a classroom on a given day, it
# cannot switch classrooms again that same day. This is a hard guarantee,
# independent of the soft S4/delta weight (which only covers stability
# across different days of the week).
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
        required_time_slots={10: 2},
        expected_students={10: 30},
        classroom_capacity={100: 40, 200: 40},
        classroom_type={100: "COMMON", 200: "COMMON"},
        required_classroom_type={10: None},
        conflicts=set(),
        # All weights zeroed on purpose: any classroom stability observed in
        # these tests must come from the hard constraint, not from the soft
        # S4/delta objective pressure.
        objective_weights=ObjectiveWeights(alpha=0.0, beta=0.0, gamma=0.0, delta=0.0),
    )
    defaults.update(overrides)
    return SolverData(**defaults)


def test_same_day_sessions_always_use_the_same_classroom():
    data = _base_data()

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    assert len(response.schedule_entries) == 2
    classroom_ids = {entry.classroom_id for entry in response.schedule_entries}
    assert len(classroom_ids) == 1


def test_infeasible_when_forced_to_switch_classrooms_within_the_same_day():
    # A second offering is locked into room 100 at slot 1001 and room 200 at
    # slot 1002 (using a second professor). Classroom exclusivity (C9) then
    # only leaves room 200 free at 1001 and room 100 free at 1002 for
    # offering 10 — the only way to satisfy C1 (2 required sessions) would
    # be to switch classrooms mid-day, which C16 now forbids outright.
    data = _base_data(
        professors=[1, 2],
        subject_offerings=[10, 20],
        valid_qualifications={(1, 10), (2, 20)},
        valid_availabilities={(1, 1001), (1, 1002), (2, 1001), (2, 1002)},
        required_time_slots={10: 2, 20: 2},
        expected_students={10: 30, 20: 30},
        locked_assignments={
            (2, 20, 100, 1001),
            (2, 20, 200, 1002),
        },
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is None


def test_feasible_when_the_forced_pattern_keeps_the_same_classroom():
    # Same locking mechanism as above, but offering 20 is pinned to the SAME
    # classroom (200) on both slots this time, leaving room 100 fully free
    # for offering 10 on both slots — no forced switch, so it stays feasible.
    data = _base_data(
        professors=[1, 2],
        subject_offerings=[10, 20],
        valid_qualifications={(1, 10), (2, 20)},
        valid_availabilities={(1, 1001), (1, 1002), (2, 1001), (2, 1002)},
        required_time_slots={10: 2, 20: 2},
        expected_students={10: 30, 20: 30},
        locked_assignments={
            (2, 20, 200, 1001),
            (2, 20, 200, 1002),
        },
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    offering_10_entries = [e for e in response.schedule_entries if e.subject_offering_id == 10]
    assert len(offering_10_entries) == 2
    classroom_ids = {entry.classroom_id for entry in offering_10_entries}
    assert classroom_ids == {100}


def test_different_days_are_not_forced_to_share_a_classroom():
    # C16 is scoped to a single day — an offering meeting on two different
    # days may still use two different classrooms (that's still governed
    # softly by S4/delta, unchanged by this feature).
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
