from dataclasses import dataclass, field
from models import OptimizationRequest, ObjectiveWeightsDTO
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

@dataclass(frozen=True)
class ObjectiveWeights:
    alpha: float = 1.0
    beta: float = 1.0
    gamma: float = 1.0
    delta: float = 1.0
    epsilon: float = 0.0

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

    objective_weights: ObjectiveWeights

    # TimeSlots the admin wants the optimizer to prefer (e.g. "morning
    # only"), weighted by objective_weights.epsilon. Empty means no
    # time-of-day preference at all.
    preferred_time_slots: set[int] = field(default_factory=set)

    # Per-professor hard caps on how many TimeSlots they can be scheduled
    # for, per day / per week. A professor absent from a dict has no cap.
    # Defaulted (rather than required) so existing SolverData call sites
    # that predate this feature don't need updating.
    max_daily_slots: dict[int, int] = field(default_factory=dict)
    max_weekly_slots: dict[int, int] = field(default_factory=dict)

    # t_r
    classroom_type: dict[int, str] = field(default_factory=dict)

    # Required room type per offering — absent/None means no preference
    # (any classroom, subject to capacity, is fine).
    required_classroom_type: dict[int, str | None] = field(default_factory=dict)

    # TimeSlot ids each offering is hard-restricted to (e.g. its course's
    # mandatory shift). An offering absent from this dict has no
    # restriction — enforced by never creating its x variable outside the
    # set, rather than by a linear constraint.
    allowed_time_slots: dict[int, set[int]] = field(default_factory=dict)

    # Offerings whose Subject supports co-teaching — C2 (unique professor
    # assignment) is relaxed from "exactly one professor" to "at least one"
    # for these, letting different lectures of the same offering be covered
    # by different professors. Absent means the normal single-professor rule.
    co_teaching_offerings: set[int] = field(default_factory=set)

    # (professor, offering, classroom, time_slot) tuples carried over from a
    # previous generation that must stay exactly as-is — matches the x
    # variable's own (p, o, r, t) key shape so a locked entry can be looked
    # up directly during variable creation.
    locked_assignments: set[tuple[int, int, int, int]] = field(default_factory=set)

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

    classroom_type = {
        c.id: c.type
        for c in request.classrooms
    }

    required_classroom_type = {
        o.id: o.required_room_type
        for o in request.subject_offerings
    }

    allowed_time_slots = {
        o.id: set(o.allowed_time_slot_ids)
        for o in request.subject_offerings
        if o.allowed_time_slot_ids is not None
    }

    co_teaching_offerings = {
        o.id for o in request.subject_offerings
        if o.allows_multiple_professors
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
    # Professor Hour Caps
    # ======================================================
    #
    # Only professors with an actual cap set appear in these dicts —
    # absence means "no limit" for that professor.
    #
    # ======================================================

    max_daily_slots = {
        p.id: p.max_daily_time_slots
        for p in request.professors
        if p.max_daily_time_slots is not None
    }

    max_weekly_slots = {
        p.id: p.max_weekly_time_slots
        for p in request.professors
        if p.max_weekly_time_slots is not None
    }

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
    # Locked Assignments
    # ======================================================
    #
    # (professor, offering, classroom, time slot) tuples that must be
    # fixed to 1 when the x variable is created.
    #
    # ======================================================

    locked_assignments = {
        (locked.professor_id, locked.subject_offering_id, locked.classroom_id, locked.time_slot_id)
        for locked in request.locked_assignments
    }

    # ======================================================
    # Validations
    # =====================================================

    validate_professor_coverage(subject_offerings = request.subject_offerings, valid_qualifications = valid_qualifications)
    validate_classroom_capacity(subject_offerings = request.subject_offerings, classrooms = request.classrooms)
    validate_classroom_type_coverage(subject_offerings = request.subject_offerings, classrooms = request.classrooms)
    validate_professor_time_capacity(
        subject_offerings = request.subject_offerings,
        professors = request.professors,
        valid_qualifications = valid_qualifications,
        max_weekly_slots = max_weekly_slots,
    )
    validate_locked_assignments_feasible(
        locked_assignments = request.locked_assignments,
        valid_qualifications = valid_qualifications,
        valid_availabilities = valid_availabilities,
        classroom_capacity = classroom_capacity,
        classroom_type = classroom_type,
        required_classroom_type = required_classroom_type,
        expected_students = expected_students,
    )
    validate_offering_shift_capacity(
        subject_offerings = request.subject_offerings,
        professors = request.professors,
        valid_qualifications = valid_qualifications,
    )

    # ======================================================
    # Weights
    # =====================================================

    weights = ObjectiveWeights(
        alpha=request.objective_weights.alpha,
        beta=request.objective_weights.beta,
        gamma=request.objective_weights.gamma,
        delta=request.objective_weights.delta,
        epsilon=request.objective_weights.epsilon,
    )

    preferred_time_slots = set(request.preferred_time_slot_ids)

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
        slot_day=slot_day,
        valid_qualifications=valid_qualifications,
        valid_availabilities=valid_availabilities,
        required_time_slots=required_time_slots,
        expected_students=expected_students,
        classroom_capacity=classroom_capacity,
        conflicts=conflicts,
        max_daily_slots=max_daily_slots,
        max_weekly_slots=max_weekly_slots,
        classroom_type=classroom_type,
        required_classroom_type=required_classroom_type,
        objective_weights=weights,
        preferred_time_slots=preferred_time_slots,
        locked_assignments=locked_assignments,
        allowed_time_slots=allowed_time_slots,
        co_teaching_offerings=co_teaching_offerings
    )

