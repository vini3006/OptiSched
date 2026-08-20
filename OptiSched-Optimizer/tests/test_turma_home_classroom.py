import os
import sys
from datetime import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from mapper import SolverData, ObjectiveWeights, build_solver_data
from models import Classroom, OptimizationRequest, Professor, SubjectOffering, TimeSlot
from solver import solve_scheduling_problem

# ==============================================================================
# C18 - Turma Home Classroom (hard)
# ==============================================================================
#
# A turma's non-specialized offerings (no required_room_type) must all use the
# same classroom across the whole week. Offerings with a required_room_type
# (labs, gym, computer room...) are exempt. Course-mode offerings (no turma)
# are untouched.
# ==============================================================================


# -------------------- mapper.py: turma_of_offering plumbing --------------------


def offering(id_, subject_id, course_id=None, turma_id=None, required_room_type=None, required_time_slots=1, expected_students=30):
    return SubjectOffering(
        id=id_,
        subject_id=subject_id,
        course_id=course_id,
        turma_id=turma_id,
        required_time_slots=required_time_slots,
        expected_students=expected_students,
        required_room_type=required_room_type,
    )


def _professors_for(offerings, time_slot_ids):
    subject_ids = sorted({o.subject_id for o in offerings})
    return [
        Professor(id=100 + s, qualified_subject_ids=[s], available_time_slot_ids=list(time_slot_ids))
        for s in subject_ids
    ]


def _classrooms_for(offerings, count=2, room_type="COMMON"):
    max_capacity = max((o.expected_students for o in offerings), default=30)
    return [Classroom(id=900 + i, capacity=max_capacity, type=room_type) for i in range(count)]


def _time_slots(ids):
    return [
        TimeSlot(id=slot_id, day_of_week="MONDAY", start_time=time(8 + idx, 0), end_time=time(9 + idx, 0))
        for idx, slot_id in enumerate(ids)
    ]


def _request(offerings, time_slot_ids, classrooms):
    return OptimizationRequest(
        professors=_professors_for(offerings, time_slot_ids),
        subject_offerings=offerings,
        classrooms=classrooms,
        time_slots=_time_slots(time_slot_ids),
    )


def test_turma_of_offering_maps_turma_mode_offerings_to_their_turma():
    offerings = [
        offering(10, subject_id=1, turma_id=900),
        offering(11, subject_id=2, turma_id=900),
    ]
    data = build_solver_data(_request(offerings, [1001], _classrooms_for(offerings)))

    assert data.turma_of_offering == {10: 900, 11: 900}


def test_turma_of_offering_excludes_course_mode_offerings():
    offerings = [
        offering(10, subject_id=1, course_id=5),
        offering(11, subject_id=2, turma_id=900),
    ]
    data = build_solver_data(_request(offerings, [1001], _classrooms_for(offerings)))

    assert data.turma_of_offering == {11: 900}


# -------------------- solver: home-room enforcement (low-level SolverData) --------------------


def _base_data(**overrides) -> SolverData:
    defaults = dict(
        professors=[1, 2],
        subject_offerings=[10, 20],
        classrooms=[100, 200],
        time_slots=[1001, 1002],
        time_slots_by_day={"MONDAY": [1001, 1002]},
        slot_position={1001: 1, 1002: 2},
        slot_day={1001: "MONDAY", 1002: "MONDAY"},
        valid_qualifications={(1, 10), (2, 20)},
        valid_availabilities={(1, 1001), (1, 1002), (2, 1001), (2, 1002)},
        required_time_slots={10: 1, 20: 1},
        expected_students={10: 30, 20: 30},
        classroom_capacity={100: 40, 200: 40},
        classroom_type={100: "COMMON", 200: "COMMON"},
        required_classroom_type={10: None, 20: None},
        conflicts=set(),
        turma_of_offering={10: 900, 20: 900},
        # All weights zeroed on purpose: any room stability observed in these
        # tests must come from the hard constraint, not soft objective pressure.
        objective_weights=ObjectiveWeights(alpha=0.0, beta=0.0, gamma=0.0, delta=0.0),
    )
    defaults.update(overrides)
    return SolverData(**defaults)


def test_offerings_of_the_same_turma_use_the_same_classroom():
    data = _base_data()

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    assert len(response.schedule_entries) == 2
    classroom_ids = {entry.classroom_id for entry in response.schedule_entries}
    assert len(classroom_ids) == 1


def test_infeasible_when_locked_into_two_different_home_classrooms():
    # Offering 10 pinned to room 100, offering 20 (same turma) pinned to
    # room 200 — both individually feasible, but C18 forbids a turma from
    # ever using two different rooms for its non-specialized offerings.
    data = _base_data(
        locked_assignments={
            (1, 10, 100, 1001),
            (2, 20, 200, 1002),
        },
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is None


def test_offering_with_required_room_type_is_exempt_from_home_classroom():
    # Offering 20 requires a LABORATORY room and is locked into room 200
    # (type LABORATORY); offering 10 (no room type) is locked into room
    # 100 (COMMON). This must stay feasible: C18 only binds offering 10
    # to a home room — offering 20 is excluded entirely.
    data = _base_data(
        classroom_type={100: "COMMON", 200: "LABORATORY"},
        required_classroom_type={10: None, 20: "LABORATORY"},
        locked_assignments={
            (1, 10, 100, 1001),
            (2, 20, 200, 1002),
        },
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    assert len(response.schedule_entries) == 2


def test_different_turmas_are_not_forced_into_the_same_home_classroom():
    data = _base_data(
        turma_of_offering={10: 900, 20: 901},
        locked_assignments={
            (1, 10, 100, 1001),
            (2, 20, 200, 1002),
        },
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    assert len(response.schedule_entries) == 2


def test_course_mode_offerings_are_unaffected_by_home_classroom_rule():
    # No turma at all — the same "different rooms" pattern that's
    # infeasible for a turma above must remain perfectly feasible here.
    data = _base_data(
        turma_of_offering={},
        locked_assignments={
            (1, 10, 100, 1001),
            (2, 20, 200, 1002),
        },
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    assert len(response.schedule_entries) == 2
