import os
import sys
from datetime import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from mapper import build_solver_data
from models import Classroom, OptimizationRequest, Professor, SubjectOffering, TimeSlot
from solver import solve_scheduling_problem

# ==============================================================================
# mapper.py's Conflict Set — SCHOOL mode (turma_id) mirrors UNIVERSITY mode
# (course_id + recommended_semester), mutually exclusive per offering.
# ==============================================================================


def offering(id_, subject_id, course_id=None, turma_id=None, recommended_semester=None, required_time_slots=1, expected_students=30):
    return SubjectOffering(
        id=id_,
        subject_id=subject_id,
        course_id=course_id,
        turma_id=turma_id,
        required_time_slots=required_time_slots,
        expected_students=expected_students,
        recommended_semester=recommended_semester,
    )


def _professors_for(offerings, time_slot_ids):
    subject_ids = sorted({o.subject_id for o in offerings})
    return [
        Professor(id=100 + s, qualified_subject_ids=[s], available_time_slot_ids=list(time_slot_ids))
        for s in subject_ids
    ]


def _classrooms_for(offerings, count=2):
    max_capacity = max((o.expected_students for o in offerings), default=30)
    return [Classroom(id=900 + i, capacity=max_capacity, type="COMMON") for i in range(count)]


def _time_slots(ids):
    return [
        TimeSlot(id=slot_id, day_of_week="MONDAY", start_time=time(8 + idx, 0), end_time=time(9 + idx, 0))
        for idx, slot_id in enumerate(ids)
    ]


def _request(offerings, time_slot_ids, classroom_count=2):
    return OptimizationRequest(
        professors=_professors_for(offerings, time_slot_ids),
        subject_offerings=offerings,
        classrooms=_classrooms_for(offerings, classroom_count),
        time_slots=_time_slots(time_slot_ids),
    )


# -------------------- build_solver_data: conflict set --------------------


def test_offerings_of_different_turmas_do_not_conflict():
    offerings = [
        offering(10, subject_id=1, turma_id=900),
        offering(11, subject_id=2, turma_id=901),
    ]
    data = build_solver_data(_request(offerings, [1001]))

    assert data.conflicts == set()


def test_offerings_of_the_same_turma_conflict():
    offerings = [
        offering(10, subject_id=1, turma_id=900),
        offering(11, subject_id=2, turma_id=900),
    ]
    data = build_solver_data(_request(offerings, [1001]))

    assert data.conflicts == {(10, 11)}


def test_university_only_offerings_still_conflict_on_course_and_semester():
    # Regression: same course_id + recommended_semester, turma_id absent —
    # the original UNIVERSITY-mode rule must keep working unchanged.
    offerings = [
        offering(10, subject_id=1, course_id=5, recommended_semester=2),
        offering(11, subject_id=2, course_id=5, recommended_semester=2),
    ]
    data = build_solver_data(_request(offerings, [1001]))

    assert data.conflicts == {(10, 11)}


def test_university_offerings_of_different_courses_do_not_conflict():
    offerings = [
        offering(10, subject_id=1, course_id=5, recommended_semester=2),
        offering(11, subject_id=2, course_id=6, recommended_semester=2),
    ]
    data = build_solver_data(_request(offerings, [1001]))

    assert data.conflicts == set()


def test_mixed_course_and_turma_offerings_do_not_conflict_with_each_other():
    offerings = [
        offering(10, subject_id=1, course_id=5, recommended_semester=2),
        offering(11, subject_id=2, turma_id=900),
    ]
    data = build_solver_data(_request(offerings, [1001]))

    assert data.conflicts == set()


# -------------------- end-to-end: turma conflict makes the model infeasible --------------------


def test_same_turma_offerings_are_infeasible_with_only_one_shared_time_slot():
    # Two different subjects/professors/classrooms — the only thing
    # preventing both from sharing the single TimeSlot is the turma
    # conflict (C4). Without it, this scenario would be trivially feasible.
    offerings = [
        offering(10, subject_id=1, turma_id=900),
        offering(11, subject_id=2, turma_id=900),
    ]
    data = build_solver_data(_request(offerings, [1001]))

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is None, "Same-turma offerings must not both fit into the single shared TimeSlot."


def test_different_turma_offerings_can_share_the_same_time_slot():
    offerings = [
        offering(10, subject_id=1, turma_id=900),
        offering(11, subject_id=2, turma_id=901),
    ]
    data = build_solver_data(_request(offerings, [1001]))

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    assert len(response.schedule_entries) == 2
