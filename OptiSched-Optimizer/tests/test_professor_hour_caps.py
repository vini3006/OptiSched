import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from solver import solve_scheduling_problem
from mapper import SolverData, ObjectiveWeights

# ==============================================================================
# C7b / C7c - Professor Max Daily/Weekly Hours
# ==============================================================================
#
# Each test proves the cap has real teeth by constructing a scenario that is
# feasible WITHOUT the cap (demand fits the professor's raw availability) but
# becomes infeasible once the cap alone is tightened — isolating the new
# constraint from any soft-objective preference that might otherwise nudge the
# solver toward a similar-looking schedule for unrelated reasons.


def _base_data(**overrides) -> SolverData:
    defaults = dict(
        professors=[1],
        subject_offerings=[10, 11],
        classrooms=[100],
        time_slots=[1001, 1002, 1003, 1004],
        time_slots_by_day={
            "MONDAY": [1001, 1002],
            "TUESDAY": [1003, 1004],
        },
        slot_position={1001: 1, 1002: 2, 1003: 1, 1004: 2},
        slot_day={1001: "MONDAY", 1002: "MONDAY", 1003: "TUESDAY", 1004: "TUESDAY"},
        valid_qualifications={(1, 10), (1, 11)},
        valid_availabilities={(1, 1001), (1, 1002), (1, 1003), (1, 1004)},
        required_time_slots={10: 2, 11: 2},
        expected_students={10: 30, 11: 30},
        classroom_capacity={100: 40},
        conflicts=set(),
        objective_weights=ObjectiveWeights(alpha=1.0, beta=1.0, gamma=1.0, delta=1.0),
    )
    defaults.update(overrides)
    return SolverData(**defaults)


def test_feasible_without_any_cap():
    # Demand: 2 offerings x 2 slots each = 4, matching the professor's exact
    # availability (4 slots across 2 days) — feasible with no cap at all.
    data = _base_data()

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    assert len(response.schedule_entries) == 4


def test_weekly_cap_makes_an_otherwise_feasible_schedule_infeasible():
    # Same demand (4) and same availability (4) as the feasible case above —
    # only difference is a weekly cap of 3, strictly below the total demand.
    data = _base_data(max_weekly_slots={1: 3})

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is None, "Weekly cap should make this demand infeasible."


def test_daily_cap_makes_an_otherwise_feasible_schedule_infeasible():
    # Professor's only availability is 2 slots on a SINGLE day (Monday).
    # 2 offerings need 1 slot each — feasible if both can land on Monday.
    data = _base_data(
        subject_offerings=[10, 11],
        time_slots=[1001, 1002],
        time_slots_by_day={"MONDAY": [1001, 1002]},
        slot_position={1001: 1, 1002: 2},
        slot_day={1001: "MONDAY", 1002: "MONDAY"},
        valid_availabilities={(1, 1001), (1, 1002)},
        required_time_slots={10: 1, 11: 1},
    )

    feasible_response = solve_scheduling_problem(data, debug_mode=False)
    assert feasible_response is not None, "Sanity check: this demand fits without any cap."

    capped_data = _base_data(
        subject_offerings=[10, 11],
        time_slots=[1001, 1002],
        time_slots_by_day={"MONDAY": [1001, 1002]},
        slot_position={1001: 1, 1002: 2},
        slot_day={1001: "MONDAY", 1002: "MONDAY"},
        valid_availabilities={(1, 1001), (1, 1002)},
        required_time_slots={10: 1, 11: 1},
        max_daily_slots={1: 1},
    )

    response = solve_scheduling_problem(capped_data, debug_mode=False)

    assert response is None, "Daily cap of 1 should block 2 same-day lectures for this professor."


def test_daily_cap_forces_a_spread_across_days_when_a_feasible_alternative_exists():
    # Same 2-offering / 1-slot-each demand, but now availability spans 2 days
    # (1 slot each) — enough room to satisfy a daily cap of 1 by spreading out.
    data = _base_data(
        subject_offerings=[10, 11],
        time_slots=[1001, 1003],
        time_slots_by_day={"MONDAY": [1001], "TUESDAY": [1003]},
        slot_position={1001: 1, 1003: 1},
        slot_day={1001: "MONDAY", 1003: "TUESDAY"},
        valid_availabilities={(1, 1001), (1, 1003)},
        required_time_slots={10: 1, 11: 1},
        max_daily_slots={1: 1},
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    assigned_days = {entry.time_slot_id for entry in response.schedule_entries}
    assert assigned_days == {1001, 1003}, "Both offerings should land on the professor's only free slots."
