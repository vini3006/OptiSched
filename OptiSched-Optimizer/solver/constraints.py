from highspy import Highs

from mapper import SolverData
from .variables import Variables
from .variables import AuxiliaryVariables

# ==========================================================
# Hard Constraints
# ==========================================================
#
# This module implements all hard constraints of the MILP
# formulation.
#
# Each function is responsible for exactly one mathematical
# constraint described in the optimization model.
#
# ==========================================================


# ==========================================================
# C1 - Required Weekly Time Slots
# ==========================================================
#
# Every SubjectOffering must be scheduled exactly h_o times
# during the week.
#
# Mathematical formulation:
#
#     Σ x_port = h_o
#   p,r,t
#
# ∀ o ∈ O
#
# ==========================================================

def add_required_time_slots_constraint(model: Highs, data: SolverData, variables: Variables) -> None:

    for offering in data.subject_offerings:

        indices = variables.x_by_offering.get(offering, [])

        coefficients = [1.0] * len(indices)

        model.addRow(
            data.required_time_slots[offering],
            data.required_time_slots[offering],
            len(indices),
            indices,
            coefficients
        )

# ==========================================================
# C2 - Unique Professor Assignment
# ==========================================================
#
# Each SubjectOffering must be assigned to exactly one professor
#
# Mathematical formulation:
#
#     Σ y_po = 1
#     p
#
# ∀ o ∈ O
#
# ==========================================================

def add_unique_professor_assignment_constraint(model: Highs, data: SolverData, variables: Variables) -> None:

    for offering in data.subject_offerings: 

        indices = variables.y_by_offering.get(offering, [])

        coefficients = [1.0] * len(indices)

        model.addRow(
            1.0,
            1.0,
            len(indices),
            indices,
            coefficients
        )

# ==========================================================
# C3 - Professor Consistency
# ==========================================================
#
# Ensures that a SubjectOffering can only be scheduled
# with the professor assigned by the y variable.
#
# Mathematical formulation:
#
#     x_port ≤ y_po --> x_port - y_po ≤ 0
#
# ∀ (p,o,r,t)
#
# ==========================================================

def add_professor_consistency_constraint(model: Highs, variables: Variables) -> None:
    
    for(p, o, r, t), x_var in variables.x.items():

        y_var = variables.y[(p, o)]

        model.addRow(
            -model.getInfinity(),
            0.0,
            2,
            [x_var, y_var],
            [1.0, -1.0]
        )

# ==========================================================
# C4 - Course Conflict
# ==========================================================
#
# SubjectOfferings belonging to the same Course and
# RecommendedSemester cannot occur simultaneously.
#
# Mathematical formulation:
#
# Σ x(p,o1,r,t) + Σ x(p,o2,r,t) ≤ 1
#   p,r             p,r
#
# ∀ (o1,o2) ∈ conflicts
# ∀ t ∈ T
#
# ==========================================================

def add_course_conflict_constraint(model: Highs, data: SolverData, variables: Variables) -> None:

    for(o1, o2) in data.conflicts:

        for time_slot in data.time_slots:

            indices = (
                variables.x_by_offering_timeslot.get((o1, time_slot), [])
                + variables.x_by_offering_timeslot.get((o2, time_slot), [])          
            )

            if not indices:
                continue

            coefficients = [1.0] * len(indices)

            model.addRow(
                -model.getInfinity(),
                1.0,
                len(indices),
                indices,
                coefficients
            )

# ==========================================================
# C5 - Professor Qualification
# ==========================================================
#
# This constraint is implicitly enforced during variable
# generation.
#
# Decision variables y(p,o) are created only for valid
# (Professor, SubjectOffering) qualification pairs.
#
# Therefore, no explicit linear constraint is required.
#
# ==========================================================


# ==========================================================
# C6 - Professor Availability
# ==========================================================
#
# This constraint is implicitly enforced during variable
# generation.
#
# Decision variables x(p,o,r,t) are created only for valid
# (Professor, TimeSlot) availability pairs.
#
# Therefore, no explicit linear constraint is required.
#
# ==========================================================

# ==========================================================
# C7 - Professor Exclusivity
# ==========================================================
#
# A professor cannot teach more than one SubjectOffering
# during the same TimeSlot.
#
# Mathematical formulation:
#
#      Σ x_port ≤ 1
#    o,r
#
# ∀ p ∈ P, t ∈ T
#
# ==========================================================

def add_professor_exclusivity_constraint(model: Highs, data: SolverData, variables: Variables) -> None:

    for professor in data.professors:

        for time_slot in data.time_slots:

            indices = variables.x_by_professor_timeslot.get((professor, time_slot), [])

            if not indices:
                continue

            coefficients = [1.0] * len(indices)

            model.addRow(
                -model.getInfinity(),
                1.0,
                len(indices),
                indices,
                coefficients
            )

# ==========================================================
# C8 - Classroom Capacity
# ==========================================================
#
# This constraint is implicitly enforced during variable
# generation.
#
# Decision variables x(p,o,r,t) are created only when:
#
#     classroom_capacity[r] >= expected_students[o]
#
# Therefore, no explicit linear constraint is required.
#
# ==========================================================

# ==========================================================
# C9 - Classroom Exclusivity
# ==========================================================
#
# A classroom cannot host more than one SubjectOffering
# during the same TimeSlot.
#
# Mathematical formulation:
#
#      Σ x_port ≤ 1
#    p,o
#
# ∀ r ∈ R, t ∈ T
#
# ==========================================================

def add_classroom_exclusivity_constraint(model: Highs, data: SolverData, variables: Variables) -> None:

    for classroom in data.classrooms:

        for time_slot in data.time_slots: 

            indices = variables.x_by_classroom_timeslot.get((classroom, time_slot), [])

            if not indices: 
                continue

            coefficients = [1.0] * len(indices)

            model.addRow(
                -model.getInfinity(),
                1.0,
                len(indices),
                indices,
                coefficients
            )

# ==========================================================
# C10 - Offering Time Slot Exclusivity
# ==========================================================
#
# A SubjectOffering cannot be assigned to more than one
# professor or classroom during the same TimeSlot.
#
# Mathematical formulation:
#
#      Σ x_port ≤ 1
#    p,r
#
# ∀ o ∈ O, t ∈ T
#
# ==========================================================

def add_offering_time_slot_exclusivity_constraint(model: Highs, data: SolverData, variables: Variables) -> None:

    for offering in data.subject_offerings:

        for time_slot in data.time_slots:

            indices = variables.x_by_offering_timeslot.get((offering, time_slot), [])

            if not indices:
                continue

            coefficients = [1.0] * len(indices)

            model.addRow(
                -model.getInfinity(),
                1.0,
                len(indices),
                indices,
                coefficients
            )   

# ==========================================================
# C11 - Day Activity Linking (Soft Constraint)
# ==========================================================
#
# If professor p teaches during TimeSlot t, then
# professor p must be active on that day.
#
# Mathematical formulation:
#
#     z_pt ≤ w_pd --> z_pt - w_pd ≤ 0
#
# ∀ p ∈ P, d ∈ D, t ∈ T_d
#
# ==========================================================

def add_day_activity_linking_constraint(model: Highs, data: SolverData, variables: Variables, auxiliary: AuxiliaryVariables) -> None:

    for(professor, time_slot), z_column in auxiliary.z.items():

        day = data.slot_day[time_slot]

        w_column = auxiliary.w[(professor, day)]

        model.addRow(
            -model.getInfinity(), 
            0.0,
            2,
            [z_column, w_column],
            [1.0, -1.0]
        )

# ==========================================================
# C12 - First / Last Slot Bounding
# ==========================================================
#
# Determines the first (f) and last (l) occupied TimeSlot
# position of each professor during each day.
#
# Mathematical formulation:
#
#   f_pd ≤ pos(t) + M(1-z_pt)
#
#   l_pd ≥ pos(t)·z_pt
#
# ∀ p ∈ P, d ∈ D, t ∈ T_d
#
# ==========================================================

def add_first_last_slot_bounding_constraint(model: Highs, data: SolverData, auxiliary: AuxiliaryVariables) -> None:

    for (professor, time_slot), z_column in auxiliary.z.items():

        day = data.slot_day[time_slot]

        position = data.slot_position[time_slot]

        M = len(data.time_slots_by_day[day])

        f_column = auxiliary.f[(professor, day)]

        l_column = auxiliary.l[(professor, day)]

        # ------------------------------------------
        # f_pd ≤ pos(t) + M(1-z_pt)
        #
        # f + Mz ≤ pos(t) + M
        # ------------------------------------------

        model.addRow(
            -model.getInfinity(),
            position + M,
            2,
            [f_column, z_column],
            [1.0, float(M)]
        )

        # ------------------------------------------
        # l_pd ≥ pos(t)·z_pt
        #
        # l - pos(t)z ≥ 0
        # ------------------------------------------

        model.addRow(
            0.0,
            model.getInfinity(),
            2,
            [l_column, z_column],
            [1.0, -float(position)]
        )

# ==========================================================
# C13 - Consecutive Lecture Linking
# ==========================================================
#
# Detects consecutive lectures.
#
# Mathematical formulation:
#
#   g_pt ≥ z_pt + z_p,next(t) - 1
#
# ∀ p ∈ P, t ∈ T : next(t) exists
#
# ==========================================================

def add_consecutive_lecture_linking_constraint(model: Highs, data: SolverData, auxiliary: AuxiliaryVariables) -> None:

    for(professor, time_slot), g_column in auxiliary.g.items():

        day = data.slot_day[time_slot]

        position = data.slot_position[time_slot]

        next_slot = data.time_slots_by_day[day][position]

        z_current = auxiliary.z[(professor, time_slot)]
        z_next = auxiliary.z[(professor, next_slot)]

        #
        # g ≥ z + z_next - 1
        #
        # g - z - z_next ≥ -1
        #

        model.addRow(
            -1.0,
            model.getInfinity(),
            3,
            [g_column, z_current, z_next],
            [1.0, -1.0, -1.0]
        )

# ==========================================================
# C14 - Same-Day Concentration
# ==========================================================
#
# Computes the number of excess lectures of a
# SubjectOffering scheduled on the same day.
#
# Mathematical formulation:
#
#      v_od ≥ Σ x_port - 1
#
# ∀ o ∈ O, d ∈ D
#
# ==========================================================

def add_same_day_concentration_constraint(model: Highs, data: SolverData, variables: Variables, auxiliary: AuxiliaryVariables) -> None:

    for offering in data.subject_offerings:

        for day, time_slots in data.time_slots_by_day.items():

            indices = []

            for time_slot in time_slots:
                columns = variables.x_by_offering_timeslot.get((offering, time_slot), [])
                indices.extend(columns)

            if not indices:
                continue

            coefficients = [1.0] * len(indices)

            v_column = auxiliary.v[(offering, day)]
            indices.append(v_column)
            coefficients.append(-1.0)

            #
            # v ≥ Σx - 1
            #
            # Σx - v ≤ 1
            #

            model.addRow(
                -model.getInfinity(),
                1.0,
                len(indices),
                indices,
                coefficients,
            )

# ==========================================================
# C15 - Classroom Consistency
# ==========================================================
#
# If a SubjectOffering uses a classroom at least once,
# the corresponding classroom usage variable must be active.
#
# Mathematical formulation:
#
#      x_port ≤ u_or
#
# ∀ p ∈ P, o ∈ O, r ∈ R, t ∈ T
#
# ==========================================================

def add_classroom_consistency_constraint(model: Highs, variables: Variables, auxiliary: AuxiliaryVariables) -> None:

    for(professor, offering, classroom, time_slot), x_column in variables.x.items():

        u_column = auxiliary.u[(offering, classroom)]

        #
        # x ≤ u
        #
        # x - u ≤ 0
        #

        model.addRow(
            -model.getInfinity(),
            0.0,
            2,
            [x_column, u_column],
            [1.0, -1.0]
        )

# ==========================================================
# Adding all the constraints to the model
# ==========================================================

def add_all_constraints(model: Highs, data: SolverData, variables: Variables, auxiliary: AuxiliaryVariables) -> None:

    # ==========================================================
    # Hard Constraints (C1 a C10)
    # Note: C5, C6 e C8 were treated in the variables domain.
    # ==========================================================

    # C1
    add_required_time_slots_constraint(model, data, variables)

    # C2
    add_unique_professor_assignment_constraint(model, data, variables)

    # C3
    add_professor_consistency_constraint(model, variables)

    # C4
    add_course_conflict_constraint(model, data, variables)

    # C7
    add_professor_exclusivity_constraint(model, data, variables)

    # C9
    add_classroom_exclusivity_constraint(model, data, variables)

    # C10
    add_offering_time_slot_exclusivity_constraint(model, data, variables)

    # ==========================================================
    # Soft Constraints / Linking (C11 a C15)
    # ==========================================================

    # C11
    add_day_activity_linking_constraint(model, data, variables, auxiliary)

    # C12
    add_first_last_slot_bounding_constraint(model, data, auxiliary)

    # C13
    add_consecutive_lecture_linking_constraint(model, data, auxiliary)

    # C14
    add_same_day_concentration_constraint(model, data, variables, auxiliary)

    # C15 
    add_classroom_consistency_constraint(model, variables, auxiliary)
