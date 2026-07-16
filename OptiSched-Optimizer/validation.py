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
