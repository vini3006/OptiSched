import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest

from models import Classroom, Professor, SubjectOffering
from validation import (
    SolverDataValidationError,
    validate_classroom_type_coverage,
    validate_professor_time_capacity,
)

# ==============================================================================
# validate_professor_time_capacity
# ==============================================================================


def offering(
    id_,
    required_time_slots,
    subject_id=1,
    course_id=1,
    expected_students=30,
    recommended_semester=1,
    required_room_type=None,
):
    return SubjectOffering(
        id=id_,
        subject_id=subject_id,
        course_id=course_id,
        required_time_slots=required_time_slots,
        expected_students=expected_students,
        recommended_semester=recommended_semester,
        required_room_type=required_room_type,
    )


def professor(id_, qualified_subject_ids, available_time_slot_ids):
    return Professor(
        id=id_,
        qualified_subject_ids=qualified_subject_ids,
        available_time_slot_ids=available_time_slot_ids,
    )


def classroom(id_, capacity, type_="COMMON"):
    return Classroom(id=id_, capacity=capacity, type=type_)


def test_passes_when_exclusively_qualified_professor_has_enough_availability():
    offerings = [offering(10, required_time_slots=2)]
    professors = [professor(1, qualified_subject_ids=[1], available_time_slot_ids=[100, 101])]
    valid_qualifications = {(1, 10)}

    # Should not raise.
    validate_professor_time_capacity(offerings, professors, valid_qualifications)


def test_raises_when_exclusively_qualified_professor_is_overloaded():
    offerings = [offering(10, required_time_slots=3)]
    professors = [professor(1, qualified_subject_ids=[1], available_time_slot_ids=[100, 101])]
    valid_qualifications = {(1, 10)}

    with pytest.raises(SolverDataValidationError, match="professor 1 needs 3 time slots but only has 2 available"):
        validate_professor_time_capacity(offerings, professors, valid_qualifications)


def test_sums_required_time_slots_across_multiple_exclusive_offerings():
    offerings = [
        offering(10, required_time_slots=2, subject_id=1),
        offering(11, required_time_slots=2, subject_id=2),
    ]
    professors = [professor(1, qualified_subject_ids=[1, 2], available_time_slot_ids=[100, 101, 102])]
    valid_qualifications = {(1, 10), (1, 11)}

    with pytest.raises(SolverDataValidationError, match="professor 1 needs 4 time slots but only has 3 available"):
        validate_professor_time_capacity(offerings, professors, valid_qualifications)


def test_does_not_raise_when_another_professor_is_also_qualified():
    # Offering has 2 qualified professors — not "exclusive" — so even though
    # professor 1 alone couldn't cover it, the solver has an alternative
    # (professor 2), so this must NOT be flagged as infeasible up front.
    offerings = [offering(10, required_time_slots=3)]
    professors = [
        professor(1, qualified_subject_ids=[1], available_time_slot_ids=[100, 101]),
        professor(2, qualified_subject_ids=[1], available_time_slot_ids=[100, 101, 102]),
    ]
    valid_qualifications = {(1, 10), (2, 10)}

    validate_professor_time_capacity(offerings, professors, valid_qualifications)


def test_reports_every_overloaded_professor():
    offerings = [
        offering(10, required_time_slots=3, subject_id=1),
        offering(11, required_time_slots=3, subject_id=2),
    ]
    professors = [
        professor(1, qualified_subject_ids=[1], available_time_slot_ids=[100]),
        professor(2, qualified_subject_ids=[2], available_time_slot_ids=[100]),
    ]
    valid_qualifications = {(1, 10), (2, 11)}

    with pytest.raises(SolverDataValidationError) as excinfo:
        validate_professor_time_capacity(offerings, professors, valid_qualifications)

    message = str(excinfo.value)
    assert "professor 1 needs 3 time slots but only has 1 available" in message
    assert "professor 2 needs 3 time slots but only has 1 available" in message


# ==============================================================================
# validate_professor_time_capacity — max_weekly_slots interaction
# ==============================================================================


def test_passes_when_weekly_cap_is_not_exceeded():
    offerings = [offering(10, required_time_slots=2)]
    professors = [professor(1, qualified_subject_ids=[1], available_time_slot_ids=[100, 101, 102])]
    valid_qualifications = {(1, 10)}

    # Should not raise: demand (2) fits both availability (3) and the cap (2).
    validate_professor_time_capacity(offerings, professors, valid_qualifications, max_weekly_slots={1: 2})


def test_raises_when_weekly_cap_is_exceeded_despite_enough_raw_availability():
    offerings = [offering(10, required_time_slots=3)]
    professors = [professor(1, qualified_subject_ids=[1], available_time_slot_ids=[100, 101, 102, 103])]
    valid_qualifications = {(1, 10)}

    # Availability (4) alone would be enough, but the weekly cap (2) isn't.
    with pytest.raises(SolverDataValidationError, match="professor 1 needs 3 time slots but only has 2 available"):
        validate_professor_time_capacity(offerings, professors, valid_qualifications, max_weekly_slots={1: 2})


def test_weekly_cap_is_ignored_for_professors_without_one_set():
    offerings = [
        offering(10, required_time_slots=2, subject_id=1),
        offering(11, required_time_slots=2, subject_id=2),
    ]
    professors = [
        professor(1, qualified_subject_ids=[1], available_time_slot_ids=[100, 101]),
        professor(2, qualified_subject_ids=[2], available_time_slot_ids=[100, 101]),
    ]
    valid_qualifications = {(1, 10), (2, 11)}

    # Only professor 1 has a cap; professor 2 is judged on availability alone.
    validate_professor_time_capacity(offerings, professors, valid_qualifications, max_weekly_slots={1: 2})


# ==============================================================================
# validate_classroom_type_coverage
# ==============================================================================


def test_passes_when_offering_has_no_room_type_preference():
    offerings = [offering(10, required_time_slots=1, expected_students=30, required_room_type=None)]
    classrooms = [classroom(100, capacity=20, type_="COMMON")]  # too small, but irrelevant here

    # Should not raise — this function only cares about type-scoped capacity.
    validate_classroom_type_coverage(offerings, classrooms)


def test_passes_when_a_matching_type_room_is_big_enough():
    offerings = [offering(10, required_time_slots=1, expected_students=30, required_room_type="LABORATORY")]
    classrooms = [
        classroom(100, capacity=20, type_="COMMON"),
        classroom(200, capacity=40, type_="LABORATORY"),
    ]

    validate_classroom_type_coverage(offerings, classrooms)


def test_raises_when_no_classroom_of_the_required_type_exists():
    offerings = [offering(10, required_time_slots=1, expected_students=30, required_room_type="LABORATORY")]
    classrooms = [classroom(100, capacity=100, type_="COMMON")]  # plenty big, wrong type

    with pytest.raises(SolverDataValidationError, match=r"\[10\]"):
        validate_classroom_type_coverage(offerings, classrooms)


def test_raises_when_matching_type_rooms_are_too_small():
    offerings = [offering(10, required_time_slots=1, expected_students=30, required_room_type="LABORATORY")]
    classrooms = [
        classroom(100, capacity=100, type_="COMMON"),
        classroom(200, capacity=10, type_="LABORATORY"),
    ]

    with pytest.raises(SolverDataValidationError, match=r"\[10\]"):
        validate_classroom_type_coverage(offerings, classrooms)
