from dataclasses import dataclass
from highspy import Highs
from highspy import HighsVarType
from mapper import SolverData
from enums import DayOfWeek


@dataclass
class Variables:

    # x_(p,o,r,t)
    x: dict[tuple[int, int, int, int], int]

    # y_(p,o)
    y: dict[tuple[int, int], int]

    # ---------- Auxiliary indices ----------

    # All x variables of a SubjectOffering
    x_by_offering: dict[int, list[int]]

    # All x variables of a professor
    x_by_professor: dict[int, list[int]]

    # All x variables occupying a classroom at a TimeSlot
    x_by_classroom_timeslot: dict[tuple[int, int], list[int]]

    # All x variables of a professor at a TimeSlot
    x_by_professor_timeslot: dict[tuple[int, int], list[int]]

    # All x variables of a SubjectOffering at a TimeSlot
    x_by_offering_timeslot: dict[tuple[int, int], list[int]]

    # All y variables of a SubjectOffering
    y_by_offering: dict[int, list[int]]

    # All y variables of a professor
    y_by_professor: dict[int, list[int]]


def create_binary_variable(
    model: Highs,
    name: str
) -> int:

    model.addVar(0.0, 1.0)

    index = model.getNumCol() - 1

    model.changeColIntegrality(
        index,
        HighsVarType.kInteger
    )

    model.passColName(
        index,
        name
    )

    return index


def create_variables(model: Highs, data: SolverData) -> Variables:

    x = {}
    y = {}

    x_by_offering = {}
    x_by_professor = {}
    x_by_classroom_timeslot = {}
    x_by_professor_timeslot = {}
    x_by_offering_timeslot = {}
    y_by_offering = {}
    y_by_professor = {}

    # --------------------------------------------------
    # Create y variables
    # --------------------------------------------------

    for (p, o) in data.valid_qualifications:

        variable = create_binary_variable(
            model,
            f"y_{p}_{o}"
        )

        y[(p, o)] = variable

        y_by_offering.setdefault(o, []).append(variable)

        y_by_professor.setdefault(p, []).append(variable)

    # --------------------------------------------------
    # Create x variables
    # --------------------------------------------------

    for (p, o) in data.valid_qualifications:

        for r in data.classrooms:

            if data.classroom_capacity[r] < data.expected_students[o]:
                continue

            required_type = data.required_classroom_type.get(o)
            if required_type is not None and data.classroom_type.get(r) != required_type:
                continue

            allowed_slots = data.allowed_time_slots.get(o)

            for t in data.time_slots:

                if (p, t) not in data.valid_availabilities:
                    continue

                if allowed_slots is not None and t not in allowed_slots:
                    continue

                variable = create_binary_variable(
                    model,
                    f"x_{p}_{o}_{r}_{t}"
                )

                x[(p, o, r, t)] = variable

                if (p, o, r, t) in data.locked_assignments:
                    model.changeColBounds(variable, 1.0, 1.0)

                # -------------------------
                # Auxiliary indices
                # -------------------------

                x_by_offering.setdefault(o, []).append(variable)

                x_by_professor.setdefault(p, []).append(variable)

                x_by_classroom_timeslot.setdefault(
                    (r, t), []
                ).append(variable)

                x_by_professor_timeslot.setdefault(
                    (p, t), []
                ).append(variable)

                x_by_offering_timeslot.setdefault(
                    (o, t), []
                ).append(variable)

    return Variables(
        x=x,
        y=y,
        x_by_offering=x_by_offering,
        x_by_professor=x_by_professor,
        x_by_classroom_timeslot=x_by_classroom_timeslot,
        x_by_professor_timeslot=x_by_professor_timeslot,
        x_by_offering_timeslot=x_by_offering_timeslot,
        y_by_offering=y_by_offering,
        y_by_professor=y_by_professor
    )

@dataclass
class AuxiliaryVariables:

    # ======================================================
    # Professor Occupancy
    # ======================================================
    #
    # z_(p,t) = 1 if professor p teaches during TimeSlot t.
    #
    z: dict[tuple[int, int], int]

    # ======================================================
    # First / Last Lecture of the Day
    # ======================================================
    #
    # f_(p,d): first occupied TimeSlot position of professor p
    # on day d.
    #
    f: dict[tuple[int, DayOfWeek], int]

    #
    # l_(p,d): last occupied TimeSlot position of professor p
    # on day d.
    #
    l: dict[tuple[int, DayOfWeek], int]

    # ======================================================
    # Professor Working Day 
    # ======================================================
    #
    # w_(p,d) = 1 if professor p teaches at least one lecture
    # during day d.
    #
    w: dict[tuple[int, DayOfWeek], int]

    # ======================================================
    # Same-Offering Block
    # ======================================================
    #
    # b_(o,t) = 1 if SubjectOffering o is scheduled both at
    # TimeSlot t and at next(t) — i.e. two of its own lectures
    # land back-to-back on the same day, forming a block
    # instead of being interleaved with other offerings.
    #
    b: dict[tuple[int, int], int]

    # ======================================================
    # Subject Distribution
    # ======================================================
    #
    # v_(o,d): number of lectures of SubjectOffering o
    # scheduled on day d in excess of one.
    #
    v: dict[tuple[int, DayOfWeek], int]

    # ======================================================
    # Classroom Consistency
    # ======================================================
    #
    # u_(o,r) = 1 if SubjectOffering o uses classroom r at
    # least once during the week.
    #
    u: dict[tuple[int, int], int]

    # ======================================================
    # Daily Classroom Consistency
    # ======================================================
    #
    # u_daily_(o,r,d) = 1 if SubjectOffering o uses classroom r
    # at least once during day d. Only created for (o,r,d)
    # combinations that actually occur among the x columns, so
    # the model doesn't pay for rooms/days an offering could
    # never use anyway.
    #
    u_daily: dict[tuple[int, int, DayOfWeek], int]

    # ======================================================
    # Same-Offering Daily Run Start
    # ======================================================
    #
    # s_(o,t) = 1 if SubjectOffering o is scheduled at TimeSlot t
    # but was NOT scheduled at the previous TimeSlot of the same
    # day (or t is the day's first slot) — i.e. t starts a new
    # block of the offering's own lectures that day.
    #
    s: dict[tuple[int, int], int]

def create_integer_variable(model: Highs, name: str, lower_bound: float = 0.0, upper_bound: float | None = None,) -> int:

    if upper_bound is None:
        upper_bound = model.getInfinity()

    model.addVar(lower_bound, upper_bound)

    index = model.getNumCol() - 1

    model.changeColIntegrality(
        index,
        HighsVarType.kInteger,
    )

    model.passColName(
        index,
        name,
    )

    return index

def create_auxiliary_variables(model: Highs, data: SolverData, variables: Variables) -> AuxiliaryVariables:
    z = {}
    f = {}
    l = {}
    w = {}
    b = {}
    v = {}
    u = {}
    u_daily = {}
    s = {}

    # ======================================================
    # Professor Variables
    # ======================================================

    for professor in data.professors:

        # --------------------------
        # Variables defined per day
        # --------------------------

        for day in data.time_slots_by_day.keys():

            # f/l track the first/last occupied slot position on this day,
            # so they can never exceed how many slots the day has. Without
            # this upper bound, a professor with zero availability on a
            # given day leaves f/l untouched by any constraint (C11/C12
            # only apply where a z variable exists), and f's negative
            # objective cost then drives it to +infinity, making the whole
            # LP relaxation unbounded (HighsModelStatus.kUnboundedOrInfeasible)
            # instead of reporting a real (in)feasibility result.
            day_slot_count = len(data.time_slots_by_day[day])

            f[(professor, day)] = create_integer_variable(
                model=model,
                name=f"f_{professor}_{day}",
                lower_bound=0,
                upper_bound=day_slot_count,
            )

            l[(professor, day)] = create_integer_variable(
                model=model,
                name=f"l_{professor}_{day}",
                lower_bound=0,
                upper_bound=day_slot_count,
            )

            w[(professor, day)] = create_binary_variable(
                model=model,
                name=f"w_{professor}_{day}",
            )


        # --------------------------
        # Variables defined per TimeSlot
        # --------------------------

        for time_slot in data.time_slots:

            if (professor, time_slot) not in data.valid_availabilities:
                continue

            z[(professor, time_slot)] = create_binary_variable(
                model=model,
                name=f"z_{professor}_{time_slot}",
            )

    # ======================================================
    # SubjectOffering Variables
    # ======================================================

    # Which (classroom, day) combinations an offering actually has at
    # least one x variable for — u_daily only needs to exist there, same
    # pruning rationale as b below.
    offering_room_days: dict[int, set[tuple[int, DayOfWeek]]] = {}

    for (professor, offering, classroom, time_slot) in variables.x.keys():

        day = data.slot_day[time_slot]

        offering_room_days.setdefault(offering, set()).add((classroom, day))

    for offering in data.subject_offerings:

        # --------------------------
        # Distribution variables
        # --------------------------

        for day in data.time_slots_by_day.keys():

            v[(offering, day)] = create_integer_variable(
                model=model,
                name=f"v_{offering}_{day}",
                lower_bound=0,
            )

        # --------------------------
        # Daily classroom consistency
        # --------------------------

        for (classroom, day) in offering_room_days.get(offering, set()):

            u_daily[(offering, classroom, day)] = create_binary_variable(
                model=model,
                name=f"u_daily_{offering}_{classroom}_{day}",
            )

        # --------------------------
        # Same-offering daily run-start variables
        # --------------------------
        #
        # s_(o,t) only needs to exist where the offering can actually be
        # scheduled at t at all — if there's no x variable there, the sum
        # is always 0 and s would be forced to 0 anyway.

        for day, slots in data.time_slots_by_day.items():

            for position, time_slot in enumerate(slots):

                if not variables.x_by_offering_timeslot.get((offering, time_slot), []):
                    continue

                s[(offering, time_slot)] = create_binary_variable(
                    model=model,
                    name=f"s_{offering}_{time_slot}",
                )

        # --------------------------
        # Classroom consistency
        # --------------------------

        for classroom in data.classrooms:

            u[(offering, classroom)] = create_binary_variable(
                model=model,
                name=f"u_{offering}_{classroom}",
            )

        # --------------------------
        # Same-offering block variables
        # --------------------------
        #
        # b_(o,t) only needs to exist where the offering can actually be
        # scheduled at BOTH t and next(t) — if either side has no valid
        # x variable at all, the sum there is always 0 and b would be
        # forced to 0 anyway, so skipping it keeps the model smaller.

        for day, slots in data.time_slots_by_day.items():

            for position in range(len(slots) - 1):

                time_slot = slots[position]
                next_time_slot = slots[position + 1]

                current_columns = variables.x_by_offering_timeslot.get((offering, time_slot), [])
                next_columns = variables.x_by_offering_timeslot.get((offering, next_time_slot), [])

                if not current_columns or not next_columns:
                    continue

                b[(offering, time_slot)] = create_binary_variable(
                    model=model,
                    name=f"b_{offering}_{time_slot}",
                )

    return AuxiliaryVariables(
        z=z,
        f=f,
        l=l,
        w=w,
        b=b,
        v=v,
        u=u,
        u_daily=u_daily,
        s=s,
    )
