# ======================================================
# Exceptions
# ======================================================

class SolverDataValidationError(Exception):
    """Raised when the input data would make the MILP model infeasible
    or structurally inconsistent, independent of the solver's search."""
    pass

# ======================================================
# Validations
# ======================================================

def validate_professor_coverage(
    subject_offerings: list,
    valid_qualifications: set[tuple[int, int]],
) -> None:

    qualified_offering_ids = {o_id for (_, o_id) in valid_qualifications}

    offerings_without_professor = [
        offering.id
        for offering in subject_offerings
        if offering.id not in qualified_offering_ids
    ]

    if offerings_without_professor:
        raise SolverDataValidationError(
            "The following SubjectOfferings have no qualified professor "
            f"and would make the model infeasible: {offerings_without_professor}"
        )
    
def validate_classroom_capacity(
    subject_offerings: list,
    classrooms: list,
) -> None:
    max_capacity = max((c.capacity for c in classrooms), default=0)

    offerings_too_large = [
        o.id for o in subject_offerings
        if o.expected_students > max_capacity
    ]

    if offerings_too_large:
        raise SolverDataValidationError(
            "The following SubjectOfferings exceed the capacity of every "
            f"available classroom: {offerings_too_large}"
        )

def validate_classroom_type_coverage(
    subject_offerings: list,
    classrooms: list,
) -> None:
    """Extends validate_classroom_capacity with room-type awareness: an
    offering requiring a specific room type (e.g. a lab) can only ever be
    scheduled in a classroom of that type, no matter how big every other
    classroom is — so the capacity check for such an offering must be scoped
    to just the matching-type subset, not the global max across all rooms."""

    capacity_by_type: dict[str, int] = {}
    for classroom in classrooms:
        capacity_by_type[classroom.type] = max(capacity_by_type.get(classroom.type, 0), classroom.capacity)

    offerings_without_matching_room = []
    for offering in subject_offerings:
        if offering.required_room_type is None:
            continue

        max_capacity_of_type = capacity_by_type.get(offering.required_room_type, 0)

        if offering.expected_students > max_capacity_of_type:
            offerings_without_matching_room.append(offering.id)

    if offerings_without_matching_room:
        raise SolverDataValidationError(
            "The following SubjectOfferings require a specific room type but "
            f"no classroom of that type is big enough (or exists): {offerings_without_matching_room}"
        )

def validate_professor_time_capacity(
    subject_offerings: list,
    professors: list,
    valid_qualifications: set[tuple[int, int]],
    max_weekly_slots: dict[int, int] | None = None,
) -> None:
    """Catches the single most common cause of solver infeasibility: a
    professor who is the ONLY one qualified for one or more offerings, whose
    combined required_time_slots exceed how many TimeSlots that professor is
    actually available for. When another professor is also qualified, the
    solver has a choice and this isn't necessarily infeasible — so this check
    only fires on exclusively-qualified offerings, where there's no
    alternative for the solver to fall back on.

    Also checks the same exclusive workload against the professor's own
    max_weekly_slots cap, when one is set — a professor might have plenty of
    raw availability but still be structurally overloaded relative to their
    own weekly limit. There's no equivalent daily pre-check: required_time_slots
    is only a weekly total, with no per-day breakdown, so an early "would this
    exceed the daily cap" check isn't derivable here — that case is still
    caught by the solver's hard constraint itself, just not pre-empted."""

    max_weekly_slots = max_weekly_slots or {}

    qualified_professor_count = {}
    for (_, offering_id) in valid_qualifications:
        qualified_professor_count[offering_id] = qualified_professor_count.get(offering_id, 0) + 1

    exclusive_offering_ids_by_professor: dict[int, list[int]] = {}
    for (professor_id, offering_id) in valid_qualifications:
        if qualified_professor_count[offering_id] == 1:
            exclusive_offering_ids_by_professor.setdefault(professor_id, []).append(offering_id)

    required_time_slots_by_offering = {o.id: o.required_time_slots for o in subject_offerings}

    overloaded_professors = []
    for professor in professors:
        exclusive_offering_ids = exclusive_offering_ids_by_professor.get(professor.id, [])
        required = sum(required_time_slots_by_offering[o_id] for o_id in exclusive_offering_ids)
        available = len(professor.available_time_slot_ids)
        weekly_cap = max_weekly_slots.get(professor.id)

        limit = min(available, weekly_cap) if weekly_cap is not None else available

        if required > limit:
            overloaded_professors.append((professor.id, required, limit))

    if overloaded_professors:
        details = ", ".join(
            f"professor {professor_id} needs {required} time slots but only has "
            f"{available} available"
            for professor_id, required, available in overloaded_professors
        )
        raise SolverDataValidationError(
            f"The following professors are overloaded relative to their availability: {details}"
        )

def validate_offering_shift_capacity(
    subject_offerings: list,
    professors: list,
    valid_qualifications: set[tuple[int, int]],
) -> None:
    """Catches two structural infeasibility patterns caused by a course's
    mandatory shift (SubjectOffering.allowed_time_slot_ids):
    1. The shift window itself doesn't have enough slots for the offering's
       weekly requirement, regardless of who teaches it.
    2. The offering's only qualified professor doesn't have enough
       availability WITHIN that window specifically — their overall
       availability (ignoring the shift) could still look fine."""

    availability_by_professor = {
        p.id: set(p.available_time_slot_ids) for p in professors
    }

    qualified_professor_count: dict[int, int] = {}
    for (_, offering_id) in valid_qualifications:
        qualified_professor_count[offering_id] = qualified_professor_count.get(offering_id, 0) + 1

    exclusive_professor_by_offering: dict[int, int] = {}
    for (professor_id, offering_id) in valid_qualifications:
        if qualified_professor_count[offering_id] == 1:
            exclusive_professor_by_offering[offering_id] = professor_id

    insufficient_window = []
    insufficient_overlap = []

    for offering in subject_offerings:
        if offering.allowed_time_slot_ids is None:
            continue

        allowed = set(offering.allowed_time_slot_ids)

        if len(allowed) < offering.required_time_slots:
            insufficient_window.append(offering.id)
            continue

        exclusive_professor = exclusive_professor_by_offering.get(offering.id)
        if exclusive_professor is not None:
            overlap = allowed & availability_by_professor.get(exclusive_professor, set())
            if len(overlap) < offering.required_time_slots:
                insufficient_overlap.append(offering.id)

    if insufficient_window:
        raise SolverDataValidationError(
            "The following SubjectOfferings need more weekly lectures than "
            f"their course's mandatory shift has room for: {insufficient_window}"
        )

    if insufficient_overlap:
        raise SolverDataValidationError(
            "The following SubjectOfferings' only qualified professor isn't "
            f"available enough within their course's mandatory shift: {insufficient_overlap}"
        )

def validate_locked_assignments_feasible(
    locked_assignments: list,
    valid_qualifications: set[tuple[int, int]],
    valid_availabilities: set[tuple[int, int]],
    classroom_capacity: dict[int, int],
    classroom_type: dict[int, str],
    required_classroom_type: dict[int, str | None],
    expected_students: dict[int, int],
) -> None:
    """A locked assignment carries forward an exact (professor, offering,
    classroom, time slot) combination from a previous generation. Something
    about the surrounding data may have changed since then (the professor's
    availability, the classroom's capacity, etc.), so each locked tuple must
    still be validated against the CURRENT data before the solver runs —
    otherwise it would silently fail to create the corresponding x variable,
    and the "lock" would have no effect instead of raising a clear error."""

    problems = []

    for locked in locked_assignments:
        professor_id = locked.professor_id
        offering_id = locked.subject_offering_id
        classroom_id = locked.classroom_id
        time_slot_id = locked.time_slot_id

        if (professor_id, offering_id) not in valid_qualifications:
            problems.append(
                f"offering {offering_id}: professor {professor_id} is no longer "
                "qualified to teach it"
            )
            continue

        if (professor_id, time_slot_id) not in valid_availabilities:
            problems.append(
                f"offering {offering_id}: professor {professor_id} is no longer "
                f"available at time slot {time_slot_id}"
            )
            continue

        if classroom_capacity.get(classroom_id, 0) < expected_students.get(offering_id, 0):
            problems.append(
                f"offering {offering_id}: classroom {classroom_id} no longer has "
                "enough capacity"
            )
            continue

        required_type = required_classroom_type.get(offering_id)
        if required_type is not None and classroom_type.get(classroom_id) != required_type:
            problems.append(
                f"offering {offering_id}: classroom {classroom_id} is no longer "
                f"a {required_type} room"
            )

    if problems:
        raise SolverDataValidationError(
            "The following locked classes could not be kept as-is because the "
            f"underlying data changed since they were locked: {'; '.join(problems)}"
        )
