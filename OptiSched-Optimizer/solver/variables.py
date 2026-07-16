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

            for t in data.time_slots:

                if (p, t) not in data.valid_availabilities:
                    continue

                variable = create_binary_variable(
                    model,
                    f"x_{p}_{o}_{r}_{t}"
                )

                x[(p, o, r, t)] = variable

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
    # Consecutive Lectures
    # ======================================================
    #
    # g_(p,t) = 1 if professor p teaches both TimeSlot t and
    # next(t).
    #
    g: dict[tuple[int, int], int]

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

def create_auxiliary_variables(model: Highs, data: SolverData,) -> AuxiliaryVariables:
    z = {}
    f = {}
    l = {}
    w = {}
    g = {}
    v = {}
    u = {}

    # ======================================================
    # Professor Variables
    # ======================================================

    for professor in data.professors:

        # --------------------------
        # Variables defined per day
        # --------------------------

        for day in data.time_slots_by_day.keys():

            f[(professor, day)] = create_integer_variable(
                model=model,
                name=f"f_{professor}_{day}",
                lower_bound=0,
            )

            l[(professor, day)] = create_integer_variable(
                model=model,
                name=f"l_{professor}_{day}",
                lower_bound=0,
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

            day = data.slot_day[time_slot]

            position = data.slot_position[time_slot]

            slots = data.time_slots_by_day[day]

            # g only exists if there is a next TimeSlot
            if position < len(slots) - 1:

                next_time_slot = slots[position+1]

                if (professor, next_time_slot) in data.valid_availabilities:
                    g[(professor, time_slot)] = create_binary_variable(
                        model=model,
                        name=f"g_{professor}_{time_slot}",
                    )

    # ======================================================
    # SubjectOffering Variables
    # ======================================================

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
        # Classroom consistency
        # --------------------------

        for classroom in data.classrooms:

            u[(offering, classroom)] = create_binary_variable(
                model=model,
                name=f"u_{offering}_{classroom}",
            )

    return AuxiliaryVariables(
        z=z,
        f=f,
        l=l,
        w=w,
        g=g,
        v=v,
        u=u,
    )
