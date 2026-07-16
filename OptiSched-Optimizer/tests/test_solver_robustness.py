import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from solver import solve_scheduling_problem
from mapper import SolverData  


# ==============================================================================
# DEFINITIVE TEST CASES (ROBUSTNESS & CONSTRAINTS)
# ==============================================================================

def test_professor_collision_prevention():
    """
    Test 3: Professor Collision Constraint.
    We have two different subject offerings taught by the SAME professor.
    There are two different classrooms and two different slots, but since the 
    professor cannot be in two places at once, they must be scheduled in 
    DIFFERENT slots.
    """
    prof_id = 1
    offering_a = 10
    offering_b = 20
    room_1 = 100
    room_2 = 200
    slot1_id = 1001
    slot2_id = 1002
    monday = "MONDAY"

    data = SolverData(
        professors=[prof_id],
        subject_offerings=[offering_a, offering_b],
        classrooms=[room_1, room_2],
        time_slots=[slot1_id, slot2_id],
        time_slots_by_day={
            monday: [slot1_id, slot2_id]
        },
        slot_position={
            slot1_id: 1,
            slot2_id: 2
        },
        slot_day={
            slot1_id: monday,
            slot2_id: monday
        },
        valid_qualifications={
            (prof_id, offering_a),
            (prof_id, offering_b)
        },
        valid_availabilities={
            (prof_id, slot1_id),
            (prof_id, slot2_id)
        },
        required_time_slots={
            offering_a: 1,  # 1 slot for A
            offering_b: 1   # 1 slot for B
        },
        expected_students={
            offering_a: 20,
            offering_b: 20
        },
        classroom_capacity={
            room_1: 30,
            room_2: 30
        },
        conflicts=set()  # No group conflicts, only the professor bottleneck
    )

    # Run solver
    response = solve_scheduling_problem(data, debug_mode=False)
    
    assert response is not None, "Solver should find a solution by distributing the slots."
    assert len(response.schedule_entries) == 2, "Both offerings must be scheduled."
    
    # Extract scheduled slots for each offering
    slot_a = next(e.time_slot_id for e in response.schedule_entries if e.subject_offering_id == offering_a)
    slot_b = next(e.time_slot_id for e in response.schedule_entries if e.subject_offering_id == offering_b)
    
    # Assert that the professor was not scheduled for both classes at the exact same time
    assert slot_a != slot_b, "The same professor cannot be scheduled in two different offerings at the same time slot."


def test_classroom_capacity_constraint():
    """
    Test 4: Classroom Capacity Constraint.
    An offering has 50 expected students. We have two classrooms: 
    - Room 100 (capacity 30 - insufficient)
    - Room 200 (capacity 60 - sufficient)
    The solver must dynamically choose Room 200.
    """
    prof_id = 1
    offering_id = 10
    room_small = 100
    room_large = 200
    slot1_id = 1001
    monday = "MONDAY"

    data = SolverData(
        professors=[prof_id],
        subject_offerings=[offering_id],
        classrooms=[room_small, room_large],
        time_slots=[slot1_id],
        time_slots_by_day={
            monday: [slot1_id]
        },
        slot_position={
            slot1_id: 1
        },
        slot_day={
            slot1_id: monday
        },
        valid_qualifications={
            (prof_id, offering_id)
        },
        valid_availabilities={
            (prof_id, slot1_id)
        },
        required_time_slots={
            offering_id: 1
        },
        expected_students={
            offering_id: 50  # 50 students
        },
        classroom_capacity={
            room_small: 30,  # Cannot fit
            room_large: 60   # Can fit!
        },
        conflicts=set()
    )

    # Run solver
    response = solve_scheduling_problem(data, debug_mode=False)
    
    assert response is not None, "Solver should find a valid room that fits the students."
    assert len(response.schedule_entries) == 1
    
    entry = response.schedule_entries[0]
    assert entry.classroom_id == room_large, "Solver should have assigned the larger classroom (Room 200)."


def test_student_group_conflict_prevention():
    """
    Test 5: Student Group Conflicts.
    Offering A and Offering B have a conflict (e.g., they belong to the same 
    student semester group, so the same students take both classes).
    Even though they have different qualified professors and enough classrooms,
    they CANNOT be scheduled at the same time slot.
    """
    prof_a = 1
    prof_b = 2
    offering_a = 10
    offering_b = 20
    room_1 = 100
    room_2 = 200
    slot1_id = 1001
    slot2_id = 1002
    monday = "MONDAY"

    data = SolverData(
        professors=[prof_a, prof_b],
        subject_offerings=[offering_a, offering_b],
        classrooms=[room_1, room_2],
        time_slots=[slot1_id, slot2_id],
        time_slots_by_day={
            monday: [slot1_id, slot2_id]
        },
        slot_position={
            slot1_id: 1,
            slot2_id: 2
        },
        slot_day={
            slot1_id: monday,
            slot2_id: monday
        },
        valid_qualifications={
            (prof_a, offering_a),
            (prof_b, offering_b)
        },
        valid_availabilities={
            (prof_a, slot1_id),
            (prof_a, slot2_id),
            (prof_b, slot1_id),
            (prof_b, slot2_id)
        },
        required_time_slots={
            offering_a: 1,
            offering_b: 1
        },
        expected_students={
            offering_a: 25,
            offering_b: 25
        },
        classroom_capacity={
            room_1: 30,
            room_2: 30
        },
        # Representing a bidirectional conflict between these two offerings
        conflicts={
            (offering_a, offering_b),
            (offering_b, offering_a)
        }
    )

    # Run solver
    response = solve_scheduling_problem(data, debug_mode=False)
    
    assert response is not None, "Solver should find a solution by separating slots."
    assert len(response.schedule_entries) == 2
    
    slot_a = next(e.time_slot_id for e in response.schedule_entries if e.subject_offering_id == offering_a)
    slot_b = next(e.time_slot_id for e in response.schedule_entries if e.subject_offering_id == offering_b)
    
    # Assert that the scheduling conflict forced them to different slots
    assert slot_a != slot_b, "Conflicting offerings must not be scheduled in the same time slot."


def test_classroom_collision_prevention():
    """
    Test 6: Classroom Collision Constraint.

    Two different professors teach two different subject offerings.
    There is only ONE classroom available and both professors are
    available at the same time.

    Since the classroom cannot host two lectures simultaneously,
    the solver must schedule the offerings in different time slots.
    """

    prof_a = 1
    prof_b = 2

    offering_a = 10
    offering_b = 20

    room_id = 100

    slot1_id = 1001
    slot2_id = 1002

    monday = "MONDAY"

    data = SolverData(
        professors=[prof_a, prof_b],
        subject_offerings=[offering_a, offering_b],
        classrooms=[room_id],
        time_slots=[slot1_id, slot2_id],

        time_slots_by_day={
            monday: [slot1_id, slot2_id]
        },

        slot_position={
            slot1_id: 1,
            slot2_id: 2
        },

        slot_day={
            slot1_id: monday,
            slot2_id: monday
        },

        valid_qualifications={
            (prof_a, offering_a),
            (prof_b, offering_b),
        },

        valid_availabilities={
            (prof_a, slot1_id),
            (prof_a, slot2_id),
            (prof_b, slot1_id),
            (prof_b, slot2_id),
        },

        required_time_slots={
            offering_a: 1,
            offering_b: 1,
        },

        expected_students={
            offering_a: 20,
            offering_b: 20,
        },

        classroom_capacity={
            room_id: 30,
        },

        conflicts=set()
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None, "Solver should find a feasible schedule."
    assert len(response.schedule_entries) == 2

    entry_a = next(
        e for e in response.schedule_entries
        if e.subject_offering_id == offering_a
    )

    entry_b = next(
        e for e in response.schedule_entries
        if e.subject_offering_id == offering_b
    )

    # Both offerings must use the only available classroom.
    assert entry_a.classroom_id == room_id
    assert entry_b.classroom_id == room_id

    # They cannot occupy the classroom simultaneously.
    assert (
        entry_a.time_slot_id != entry_b.time_slot_id
    ), "The same classroom cannot host two lectures at the same time."


def test_professor_qualification_constraint():
    """
    Test 7: Professor Qualification Constraint.

    Two professors are available, but only one is qualified to teach
    the subject offering.

    The solver must assign the offering to the qualified professor.
    """

    prof_qualified = 1
    prof_unqualified = 2

    offering_id = 10

    room_id = 100

    slot_id = 1001

    monday = "MONDAY"

    data = SolverData(
        professors=[prof_qualified, prof_unqualified],
        subject_offerings=[offering_id],
        classrooms=[room_id],
        time_slots=[slot_id],

        time_slots_by_day={
            monday: [slot_id]
        },

        slot_position={
            slot_id: 1
        },

        slot_day={
            slot_id: monday
        },

        # Apenas o professor 1 é qualificado
        valid_qualifications={
            (prof_qualified, offering_id)
        },

        # Ambos estão disponíveis
        valid_availabilities={
            (prof_qualified, slot_id),
            (prof_unqualified, slot_id),
        },

        required_time_slots={
            offering_id: 1
        },

        expected_students={
            offering_id: 20
        },

        classroom_capacity={
            room_id: 30
        },

        conflicts=set()
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    assert len(response.schedule_entries) == 1

    entry = response.schedule_entries[0]

    # Deve escolher o professor qualificado
    assert entry.professor_id == prof_qualified

    # Nunca o não qualificado
    assert entry.professor_id != prof_unqualified

def test_unique_professor_assignment():
    """
    Test 8: Unique Professor Assignment.

    Two professors are qualified to teach the same subject offering.

    The offering requires multiple lectures during the week.

    The solver must assign ALL lectures of the offering to the SAME professor.
    """

    prof_a = 1
    prof_b = 2

    offering = 10

    room = 100

    slot1 = 1001
    slot2 = 1002

    monday = "MONDAY"

    data = SolverData(
        professors=[prof_a, prof_b],
        subject_offerings=[offering],
        classrooms=[room],
        time_slots=[slot1, slot2],

        time_slots_by_day={
            monday: [slot1, slot2]
        },

        slot_position={
            slot1: 1,
            slot2: 2
        },

        slot_day={
            slot1: monday,
            slot2: monday
        },

        valid_qualifications={
            (prof_a, offering),
            (prof_b, offering),
        },

        valid_availabilities={
            (prof_a, slot1),
            (prof_a, slot2),
            (prof_b, slot1),
            (prof_b, slot2),
        },

        required_time_slots={
            offering: 2
        },

        expected_students={
            offering: 20
        },

        classroom_capacity={
            room: 30
        },

        conflicts=set()
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    assert len(response.schedule_entries) == 2

    professors_used = {
        entry.professor_id
        for entry in response.schedule_entries
    }

    # Every lecture must belong to the same professor.
    assert len(professors_used) == 1, (
        "All lectures of the same subject offering must be assigned "
        "to a single professor."
    )

def test_required_time_slots():
    """
    Test 9: Required Time Slots.

    A subject offering requires exactly 3 weekly lectures.

    The solver must generate exactly 3 ScheduleEntries for
    that offering.
    """

    prof_id = 1
    offering_id = 10
    room_id = 100

    slot1 = 1001
    slot2 = 1002
    slot3 = 1003

    monday = "MONDAY"

    data = SolverData(
        professors=[prof_id],
        subject_offerings=[offering_id],
        classrooms=[room_id],
        time_slots=[slot1, slot2, slot3],

        time_slots_by_day={
            monday: [slot1, slot2, slot3]
        },

        slot_position={
            slot1: 1,
            slot2: 2,
            slot3: 3
        },

        slot_day={
            slot1: monday,
            slot2: monday,
            slot3: monday
        },

        valid_qualifications={
            (prof_id, offering_id)
        },

        valid_availabilities={
            (prof_id, slot1),
            (prof_id, slot2),
            (prof_id, slot3),
        },

        required_time_slots={
            offering_id: 3
        },

        expected_students={
            offering_id: 25
        },

        classroom_capacity={
            room_id: 30
        },

        conflicts=set()
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None

    entries = [
        e for e in response.schedule_entries
        if e.subject_offering_id == offering_id
    ]

    assert len(entries) == 3, (
        "The number of scheduled lectures must equal "
        "the required weekly workload."
    )

def test_professor_availability_constraint():
    """
    Test 10: Professor Availability.

    A professor is available only in two specific TimeSlots.

    The solver must schedule the lectures exclusively
    in those available TimeSlots.
    """

    prof_id = 1
    offering_id = 10
    room_id = 100

    slot1 = 1001
    slot2 = 1002
    slot3 = 1003

    monday = "MONDAY"

    data = SolverData(
        professors=[prof_id],
        subject_offerings=[offering_id],
        classrooms=[room_id],
        time_slots=[slot1, slot2, slot3],

        time_slots_by_day={
            monday: [slot1, slot2, slot3]
        },

        slot_position={
            slot1: 1,
            slot2: 2,
            slot3: 3
        },

        slot_day={
            slot1: monday,
            slot2: monday,
            slot3: monday
        },

        valid_qualifications={
            (prof_id, offering_id)
        },

        # Professor unavailable in slot3
        valid_availabilities={
            (prof_id, slot1),
            (prof_id, slot2),
        },

        required_time_slots={
            offering_id: 2
        },

        expected_students={
            offering_id: 20
        },

        classroom_capacity={
            room_id: 30
        },

        conflicts=set()
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    assert len(response.schedule_entries) == 2

    used_slots = {
        e.time_slot_id
        for e in response.schedule_entries
    }

    assert slot3 not in used_slots, (
        "The solver scheduled a lecture during a TimeSlot "
        "where the professor is unavailable."
    )

    assert used_slots == {slot1, slot2}

def test_classroom_stability_objective():
    """
    Test 11: Classroom Stability Objective.

    Two identical classrooms are available.

    The subject offering requires two lectures.

    The optimal solution should keep the same classroom
    for every lecture, minimizing classroom changes.
    """

    prof = 1
    offering = 10

    room_a = 100
    room_b = 200

    slot1 = 1001
    slot2 = 1002

    monday = "MONDAY"

    data = SolverData(
        professors=[prof],
        subject_offerings=[offering],
        classrooms=[room_a, room_b],
        time_slots=[slot1, slot2],

        time_slots_by_day={
            monday: [slot1, slot2]
        },

        slot_position={
            slot1: 1,
            slot2: 2
        },

        slot_day={
            slot1: monday,
            slot2: monday
        },

        valid_qualifications={
            (prof, offering)
        },

        valid_availabilities={
            (prof, slot1),
            (prof, slot2)
        },

        required_time_slots={
            offering: 2
        },

        expected_students={
            offering: 20
        },

        classroom_capacity={
            room_a: 30,
            room_b: 30
        },

        conflicts=set()
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None

    used_rooms = {
        e.classroom_id
        for e in response.schedule_entries
    }

    assert len(used_rooms) == 1, (
        "The objective should keep the same classroom "
        "throughout the week."
    )

def test_distribution_along_week_objective():
    """
    Test 12: Distribution Along the Week.

    Three feasible TimeSlots exist:

        Monday 08:00
        Monday 10:00
        Tuesday 08:00

    The offering requires exactly two lectures.

    Although scheduling both lectures on Monday is feasible,
    the objective should distribute them across different days.
    """

    prof = 1
    offering = 10
    room = 100

    monday = "MONDAY"
    tuesday = "TUESDAY"

    mon_slot1 = 1001
    mon_slot2 = 1002
    tue_slot = 2001

    data = SolverData(
        professors=[prof],
        subject_offerings=[offering],
        classrooms=[room],
        time_slots=[
            mon_slot1,
            mon_slot2,
            tue_slot
        ],

        time_slots_by_day={
            monday: [mon_slot1, mon_slot2],
            tuesday: [tue_slot]
        },

        slot_position={
            mon_slot1: 1,
            mon_slot2: 2,
            tue_slot: 1
        },

        slot_day={
            mon_slot1: monday,
            mon_slot2: monday,
            tue_slot: tuesday
        },

        valid_qualifications={
            (prof, offering)
        },

        valid_availabilities={
            (prof, mon_slot1),
            (prof, mon_slot2),
            (prof, tue_slot)
        },

        required_time_slots={
            offering: 2
        },

        expected_students={
            offering: 20
        },

        classroom_capacity={
            room: 30
        },

        conflicts=set()
    )

    response = solve_scheduling_problem(data, debug_mode=False)

    assert response is not None
    assert len(response.schedule_entries) == 2

    used_days = {
        data.slot_day[e.time_slot_id]
        for e in response.schedule_entries
    }

    assert len(used_days) == 2, (
        "The objective should distribute lectures across different days "
        "instead of concentrating them on the same day."
    )

