from dataclasses import dataclass
from models import OptimizationRequest
from validation import *
from enums import DayOfWeek     


# ==========================================================
# Internal Data Structure
# ==========================================================
#
# This class contains the mathematical representation of the
# scheduling problem.
#
# The optimizer never works directly with the API DTOs.
# Instead, it receives an instance of SolverData containing
# the sets and parameters required by the MILP model.
#
# ==========================================================

@dataclass
class SolverData:
    # -------------------------
    # Sets
    # -------------------------

    professors: list[int]
    subject_offerings: list[int]
    classrooms: list[int]
    time_slots: list[int]

    # TimeSlots grouped by day.
    # Example:
    # {
    #     1: [1,2,3,4],
    #     2: [5,6,7,8],
    #     ...
    # }
    time_slots_by_day: dict[DayOfWeek, list[int]]

    # Position of each TimeSlot inside its day.
    # Example:
    # {
    #     1:0,
    #     2:1,
    #     3:2,
    #     ...
    # }
    slot_position: dict[int, int]

    # Day of week of each TimeSlot.
    # Example:
    # {
    #     1:MONDAY,
    #     2:TUESDAY,
    #     3:WEDNESDAY,
    #     ...
    # }
    slot_day: dict[int, DayOfWeek]

    # -------------------------
    # Parameters
    # -------------------------

    # Valid (Professor, SubjectOffering) pairs.
    #
    # (p,o) ∈ valid_qualifications
    #
    valid_qualifications: set[tuple[int, int]]

    # Valid (Professor, TimeSlot) pairs.
    #
    # (p,t) ∈ valid_availabilities
    #
    valid_availabilities: set[tuple[int, int]]

    # h_o
    required_time_slots: dict[int, int]

    # e_o
    expected_students: dict[int, int]

    # c_r
    classroom_capacity: dict[int, int]

    # Subject offerings that cannot occur simultaneously
    # (same course + recommended semester)
    conflicts: set[tuple[int, int]]

# ==========================================================
# Mapper
# ==========================================================

def build_solver_data(request: OptimizationRequest) -> SolverData:
    # =============================================================
    # Converts the OptimizationRequest received from the Java API
    # into the mathematical structures required by the MILP solver.
    # ==============================================================

    # ======================================================
    # Sets
    # ======================================================

    professors = [p.id for p in request.professors]

    subject_offerings = [o.id for o in request.subject_offerings]

    classrooms = [c.id for c in request.classrooms]

    time_slots = [t.id for t in request.time_slots]

    # ======================================================
    # Subject Offering Parameters
    # ======================================================

    required_time_slots = {
        o.id: o.required_time_slots
        for o in request.subject_offerings
    }

    expected_students = {
        o.id: o.expected_students
        for o in request.subject_offerings
    }

    # ======================================================
    # Classroom Parameters
    # ======================================================

    classroom_capacity = {
        c.id: c.capacity
        for c in request.classrooms
    }

    # ======================================================
    # Valid Qualifications
    # ======================================================
    #
    # Stores only valid (Professor, SubjectOffering) pairs.
    #
    # This avoids building a dense qualification matrix full
    # of False values.
    #
    # ======================================================

    valid_qualifications = set()

    for professor in request.professors:

        qualified_subjects = set(professor.qualified_subject_ids)

        for offering in request.subject_offerings:

            if offering.subject_id in qualified_subjects:

                valid_qualifications.add(
                    (professor.id, offering.id)
                )

    # ======================================================
    # Valid Availabilities
    # ======================================================
    #
    # Stores only valid (Professor, TimeSlot) pairs.
    #
    # ======================================================

    valid_availabilities = set()

    for professor in request.professors:

        for slot in professor.available_time_slot_ids:

            valid_availabilities.add(
                (professor.id, slot)
            )

    # ======================================================
    # Conflict Set
    # ======================================================
    #
    # Two SubjectOfferings conflict if they belong to the
    # same course and recommended semester.
    #
    # These offerings cannot be scheduled during the same
    # TimeSlot.
    #
    # ======================================================

    conflicts = set()

    offerings = request.subject_offerings

    for i in range(len(offerings)):

        for j in range(i + 1, len(offerings)):

            o1 = offerings[i]
            o2 = offerings[j]

            if (
                o1.course_id == o2.course_id
                and
                o1.recommended_semester == o2.recommended_semester
            ):

                conflicts.add((o1.id, o2.id))

    # ======================================================
    # TimeSlot Organization
    # ======================================================
    #
    # Required for soft constraints involving timetable holes
    # and lecture distribution.
    #
    # TimeSlots are grouped by day and ordered by start time.
    #
    # ======================================================

    time_slots_by_day = {}

    for slot in request.time_slots:

        time_slots_by_day.setdefault(slot.day_of_week, []).append(slot)

    for day in time_slots_by_day:

        time_slots_by_day[day].sort(key=lambda slot: slot.start_time)

    slot_position: dict[int, int] = {}

    slot_day: dict[int, DayOfWeek] = {}

    grouped_slots: dict[DayOfWeek, list[int]] = {}

    for day, slots in time_slots_by_day.items():

        grouped_slots[day] = []

        for position, slot in enumerate(slots):

            grouped_slots[day].append(slot.id)

            slot_position[slot.id] = position + 1

            slot_day[slot.id] = day

    # ======================================================
    # Validations
    # =====================================================

    validate_professor_coverage(subject_offerings = request.subject_offerings, valid_qualifications = valid_qualifications)
    validate_classroom_capacity(subject_offerings = request.subject_offerings, classrooms = request.classrooms)

    # ======================================================
    # Return SolverData
    # =====================================================

    return SolverData(
        professors=professors,
        subject_offerings=subject_offerings,
        classrooms=classrooms,
        time_slots=time_slots,
        time_slots_by_day=grouped_slots,
        slot_position=slot_position,
        valid_qualifications=valid_qualifications,
        valid_availabilities=valid_availabilities,
        required_time_slots=required_time_slots,
        expected_students=expected_students,
        classroom_capacity=classroom_capacity,
        conflicts=conflicts,
    )

