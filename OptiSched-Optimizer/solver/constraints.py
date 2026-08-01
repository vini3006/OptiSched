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
# Each SubjectOffering must be assigned to exactly one professor for the
# whole semester — UNLESS its Subject supports co-teaching (data.
# co_teaching_offerings), in which case at least one qualified professor
# must be assigned, but more than one is allowed (each covering a subset of
# the offering's own lectures; C3 still ties every individual x_port to a
# "yes, involved" y_po, so this doesn't loosen anything else).
#
# Mathematical formulation:
#
#     Σ y_po = 1              (normal offerings)
#     p
#
#     Σ y_po ≥ 1              (co-teaching offerings)
#     p
#
# ∀ o ∈ O
#
# ==========================================================

def add_unique_professor_assignment_constraint(model: Highs, data: SolverData, variables: Variables) -> None:

    for offering in data.subject_offerings:

        indices = variables.y_by_offering.get(offering, [])

        coefficients = [1.0] * len(indices)

        upper_bound = model.getInfinity() if offering in data.co_teaching_offerings else 1.0

        model.addRow(
            1.0,
            upper_bound,
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
# C7b - Professor Max Daily Hours
# ==========================================================
#
# A professor cannot be scheduled for more than max_daily_slots[p]
# TimeSlots on any single day. Only professors present in
# data.max_daily_slots have a cap — everyone else is unrestricted.
#
# Mathematical formulation:
#
#      Σ x_port ≤ max_daily_slots[p]
#   o,r,t∈T_d
#
# ∀ p ∈ P with a cap, d ∈ D
#
# ==========================================================

def add_professor_max_daily_hours_constraint(model: Highs, data: SolverData, variables: Variables) -> None:

    for professor, cap in data.max_daily_slots.items():

        for day, slots in data.time_slots_by_day.items():

            indices = []

            for time_slot in slots:
                indices.extend(variables.x_by_professor_timeslot.get((professor, time_slot), []))

            if not indices:
                continue

            coefficients = [1.0] * len(indices)

            model.addRow(
                -model.getInfinity(),
                float(cap),
                len(indices),
                indices,
                coefficients
            )

# ==========================================================
# C7c - Professor Max Weekly Hours
# ==========================================================
#
# Same idea as C7b, but capping the professor's total TimeSlots
# across the whole week instead of per day.
#
# Mathematical formulation:
#
#      Σ x_port ≤ max_weekly_slots[p]
#    o,r,t
#
# ∀ p ∈ P with a cap
#
# ==========================================================

def add_professor_max_weekly_hours_constraint(model: Highs, data: SolverData, variables: Variables) -> None:

    for professor, cap in data.max_weekly_slots.items():

        indices = variables.x_by_professor.get(professor, [])

        if not indices:
            continue

        coefficients = [1.0] * len(indices)

        model.addRow(
            -model.getInfinity(),
            float(cap),
            len(indices),
            indices,
            coefficients
        )

# ==========================================================
# C8 - Classroom Capacity & Room Type
# ==========================================================
#
# This constraint is implicitly enforced during variable
# generation.
#
# Decision variables x(p,o,r,t) are created only when:
#
#     classroom_capacity[r] >= expected_students[o]
#     AND (required_classroom_type[o] is None OR classroom_type[r] == required_classroom_type[o])
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
# C10b - Professor Occupancy Definition
# ==========================================================
#
# Defines what z_pt actually means: z_pt = 1 iff professor p is scheduled
# to teach ANY offering during TimeSlot t.
#
#   z_pt = Σ x_port
#         o,r
#
# ∀ p ∈ P, t ∈ T
#
# Without this, z is only ever referenced by C11/C12/C13/S1's objective
# cost — nothing ties it to the actual x assignment, so the solver is free
# to set z (and everything built on top of it: w, f, l, g) however is most
# convenient for the objective, completely disconnected from which classes
# are really scheduled. That silently made S1 (alpha) and S3 (gamma, once
# it became a reward instead of a penalty) collectible "for free" without
# actually compacting or consecutive-izing anyone's real schedule.
#
# ==========================================================

def add_professor_occupancy_definition_constraint(model: Highs, data: SolverData, variables: Variables, auxiliary: AuxiliaryVariables) -> None:

    for (professor, time_slot), z_column in auxiliary.z.items():

        x_columns = variables.x_by_professor_timeslot.get((professor, time_slot), [])

        indices = [z_column] + x_columns
        coefficients = [1.0] + [-1.0] * len(x_columns)

        model.addRow(
            0.0,
            0.0,
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
# C11b - Day Activity Upper Bound
# ==========================================================
#
# The other half of "w_pd = 1 iff professor p teaches at least once on
# day d": C11 only forces w UP when some z is 1 (z ≤ w). Without this row,
# w has no cost and nothing else stops the solver from leaving it at 1 on
# a day the professor never actually teaches — which is exactly what let
# C12's f/l float freely (see below) instead of collapsing to a neutral
# value on idle days.
#
#     w_pd ≤ Σ z_pt
#           t∈T_d
#
# ∀ p ∈ P, d ∈ D
#
# ==========================================================

def add_day_activity_upper_bound_constraint(model: Highs, data: SolverData, auxiliary: AuxiliaryVariables) -> None:

    for professor in data.professors:

        for day, slots in data.time_slots_by_day.items():

            w_column = auxiliary.w[(professor, day)]

            z_columns = [auxiliary.z[(professor, t)] for t in slots if (professor, t) in auxiliary.z]

            if not z_columns:
                # Professor has zero availability this day at all: w must be 0.
                model.addRow(0.0, 0.0, 1, [w_column], [1.0])
                continue

            indices = [w_column] + z_columns
            coefficients = [1.0] + [-1.0] * len(z_columns)

            model.addRow(
                -model.getInfinity(),
                0.0,
                len(indices),
                indices,
                coefficients
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
# C12b - Idle Day Zeroing
# ==========================================================
#
# On a day the professor doesn't work at all (w_pd=0), C12's per-slot rows
# above never fire (every z_pt=0 that day), leaving f/l completely
# unconstrained. f has a negative objective cost (S1 rewards it being
# large), so without this, f floats up to its own upper bound on every
# idle day, l floats to 0, and the solver collects an `alpha * M_d` bonus
# per idle day that has nothing to do with any real schedule — sometimes
# even paying more to plant extra idle days on top of a genuinely compact
# real day. Forcing f = l = 0 when w_pd = 0 makes an idle day contribute
# exactly 0, as it should.
#
#   f_pd ≤ M·w_pd
#   l_pd ≤ M·w_pd
#
# ∀ p ∈ P, d ∈ D
#
# ==========================================================

def add_idle_day_zeroing_constraint(model: Highs, data: SolverData, auxiliary: AuxiliaryVariables) -> None:

    for professor in data.professors:

        for day, slots in data.time_slots_by_day.items():

            M = len(slots)

            f_column = auxiliary.f[(professor, day)]
            l_column = auxiliary.l[(professor, day)]
            w_column = auxiliary.w[(professor, day)]

            model.addRow(
                -model.getInfinity(),
                0.0,
                2,
                [f_column, w_column],
                [1.0, -float(M)]
            )

            model.addRow(
                -model.getInfinity(),
                0.0,
                2,
                [l_column, w_column],
                [1.0, -float(M)]
            )

# ==========================================================
# C13 - Same-Offering Block Linking
# ==========================================================
#
# Standard AND-linearization: b_ot = 1 exactly when SubjectOffering o has
# a lecture BOTH at TimeSlot t and at next(t) — two of the offering's own
# sessions landing back-to-back, forming a block instead of being
# interleaved with other offerings on the same day.
#
# Σx_ot is effectively binary already (C10 caps it at 1), so it can be
# used directly in place of a dedicated occupancy variable.
#
# Mathematical formulation:
#
#   b_ot ≤ Σx_ot
#   b_ot ≤ Σx_o,next(t)
#   b_ot ≥ Σx_ot + Σx_o,next(t) - 1
#
# ∀ o ∈ O, t ∈ T : next(t) exists
#
# All three rows are required regardless of which way S3's weight pushes b:
# with only the lower bound, a *penalty* on b still works by accident
# (minimization already wants b as small as its bound allows), but a
# *reward* on b (S3's whole point — see objective.py) would let the solver
# set b=1 for free with no upper bound tying it to the offering actually
# being scheduled at both slots.
#
# ==========================================================

def add_same_offering_block_linking_constraint(model: Highs, data: SolverData, variables: Variables, auxiliary: AuxiliaryVariables) -> None:

    for(offering, time_slot), b_column in auxiliary.b.items():

        day = data.slot_day[time_slot]

        position = data.slot_position[time_slot]

        next_slot = data.time_slots_by_day[day][position]

        current_columns = variables.x_by_offering_timeslot.get((offering, time_slot), [])
        next_columns = variables.x_by_offering_timeslot.get((offering, next_slot), [])

        # b ≤ Σx_ot  -->  b - Σx_ot ≤ 0
        model.addRow(
            -model.getInfinity(),
            0.0,
            1 + len(current_columns),
            [b_column] + current_columns,
            [1.0] + [-1.0] * len(current_columns)
        )

        # b ≤ Σx_o,next(t)  -->  b - Σx_o,next(t) ≤ 0
        model.addRow(
            -model.getInfinity(),
            0.0,
            1 + len(next_columns),
            [b_column] + next_columns,
            [1.0] + [-1.0] * len(next_columns)
        )

        # b ≥ Σx_ot + Σx_o,next(t) - 1  -->  b - Σx_ot - Σx_o,next(t) ≥ -1
        model.addRow(
            -1.0,
            model.getInfinity(),
            1 + len(current_columns) + len(next_columns),
            [b_column] + current_columns + next_columns,
            [1.0] + [-1.0] * len(current_columns) + [-1.0] * len(next_columns)
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
# C16 - Daily Classroom Stability
# ==========================================================
#
# Once a SubjectOffering has been placed in a classroom on a given day,
# it cannot switch classrooms again that same day. Unlike C15/S4 (which
# only softly discourages using more than one classroom across the whole
# week, via u_or and weight delta), this is a hard guarantee scoped to a
# single day: at most one classroom per (offering, day), no exceptions.
#
# Two parts, mirroring the C15 (link) + C9 (exclusivity) pattern:
#
# (C16a) Daily classroom usage linking:
#
#      x_port ≤ u_daily_(o,r,d),  where d = day(t)
#
#   ∀ p ∈ P, o ∈ O, r ∈ R, t ∈ T
#
# (C16b) Daily classroom exclusivity:
#
#      Σ u_daily_(o,r,d) ≤ 1
#        r
#
#   ∀ o ∈ O, d ∈ D
#
# Together, these make it impossible for two different classrooms to
# both end up "used" by the same offering on the same day.
#
# ==========================================================

def add_daily_classroom_link_constraint(model: Highs, data: SolverData, variables: Variables, auxiliary: AuxiliaryVariables) -> None:

    for (professor, offering, classroom, time_slot), x_column in variables.x.items():

        day = data.slot_day[time_slot]

        u_daily_column = auxiliary.u_daily[(offering, classroom, day)]

        #
        # x ≤ u_daily
        #
        # x - u_daily ≤ 0
        #

        model.addRow(
            -model.getInfinity(),
            0.0,
            2,
            [x_column, u_daily_column],
            [1.0, -1.0]
        )

def add_daily_classroom_exclusivity_constraint(model: Highs, auxiliary: AuxiliaryVariables) -> None:

    columns_by_offering_day: dict[tuple[int, object], list[int]] = {}

    for (offering, classroom, day), u_daily_column in auxiliary.u_daily.items():
        columns_by_offering_day.setdefault((offering, day), []).append(u_daily_column)

    for indices in columns_by_offering_day.values():

        coefficients = [1.0] * len(indices)

        model.addRow(
            -model.getInfinity(),
            1.0,
            len(indices),
            indices,
            coefficients
        )

# ==========================================================
# C17 - Same-Offering Daily Contiguity
# ==========================================================
#
# If a SubjectOffering has more than one lecture on the same day, those
# lectures must be scheduled back-to-back — no gap, and no other
# offering's lecture interleaved in between. Unlike S3 (which only
# softly rewards this via b_ot / weight gamma), this is a hard
# guarantee: the block is forced, not just preferred.
#
# Uses the standard "run-start" linearization: s_ot = 1 marks a TimeSlot
# where the offering's occupancy turns on relative to the previous slot
# of the same day (or the offering's first slot on that day). Capping
# the number of run-starts per (offering, day) at 1 makes it impossible
# to have two separate blocks (i.e. a lecture, then a gap, then another
# lecture) on the same day.
#
# Mathematical formulation:
#
#   s_ot ≥ Σx_ot                          (t is the day's first slot)
#   s_ot ≥ Σx_ot − Σx_o,prev(t)           (otherwise)
#
#   Σ s_ot ≤ 1
#   t∈T_d
#
# ∀ o ∈ O, d ∈ D
#
# ==========================================================

def add_offering_daily_contiguity_constraint(model: Highs, data: SolverData, variables: Variables, auxiliary: AuxiliaryVariables) -> None:

    for offering in data.subject_offerings:

        for day, slots in data.time_slots_by_day.items():

            day_run_start_columns = []

            for position, time_slot in enumerate(slots):

                s_column = auxiliary.s.get((offering, time_slot))

                if s_column is None:
                    continue

                day_run_start_columns.append(s_column)

                current_columns = variables.x_by_offering_timeslot.get((offering, time_slot), [])

                if position == 0:

                    # s_ot ≥ Σx_ot  -->  s_ot - Σx_ot ≥ 0
                    indices = [s_column] + current_columns
                    coefficients = [1.0] + [-1.0] * len(current_columns)

                else:

                    previous_columns = variables.x_by_offering_timeslot.get((offering, slots[position - 1]), [])

                    # s_ot ≥ Σx_ot - Σx_o,prev(t)  -->  s_ot - Σx_ot + Σx_o,prev(t) ≥ 0
                    indices = [s_column] + current_columns + previous_columns
                    coefficients = [1.0] + [-1.0] * len(current_columns) + [1.0] * len(previous_columns)

                model.addRow(
                    0.0,
                    model.getInfinity(),
                    len(indices),
                    indices,
                    coefficients
                )

            if not day_run_start_columns:
                continue

            coefficients = [1.0] * len(day_run_start_columns)

            model.addRow(
                -model.getInfinity(),
                1.0,
                len(day_run_start_columns),
                day_run_start_columns,
                coefficients
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

    # C7b
    add_professor_max_daily_hours_constraint(model, data, variables)

    # C7c
    add_professor_max_weekly_hours_constraint(model, data, variables)

    # C9
    add_classroom_exclusivity_constraint(model, data, variables)

    # C10
    add_offering_time_slot_exclusivity_constraint(model, data, variables)

    # C10b
    add_professor_occupancy_definition_constraint(model, data, variables, auxiliary)

    # ==========================================================
    # Auxiliary Linking for Soft Constraints (C11 a C15)
    # ==========================================================

    # C11
    add_day_activity_linking_constraint(model, data, variables, auxiliary)

    # C11b
    add_day_activity_upper_bound_constraint(model, data, auxiliary)

    # C12
    add_first_last_slot_bounding_constraint(model, data, auxiliary)

    # C12b
    add_idle_day_zeroing_constraint(model, data, auxiliary)

    # C13
    add_same_offering_block_linking_constraint(model, data, variables, auxiliary)

    # C14
    add_same_day_concentration_constraint(model, data, variables, auxiliary)

    # C15
    add_classroom_consistency_constraint(model, variables, auxiliary)

    # ==========================================================
    # Hard Constraints (C16, C17)
    # ==========================================================

    # C16a
    add_daily_classroom_link_constraint(model, data, variables, auxiliary)

    # C16b
    add_daily_classroom_exclusivity_constraint(model, auxiliary)

    # C17
    add_offering_daily_contiguity_constraint(model, data, variables, auxiliary)
