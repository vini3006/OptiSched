import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from solver import solve_scheduling_problem
from mapper import SolverData  

def test_realistic_integration_scenario():
    """
    Test 15: Realistic Integration Scenario.

    This test simulates a small university scheduling problem.

    It does not verify the exact optimal timetable. Instead, it verifies
    that every hard constraint is satisfied in the generated solution.
    """

    monday = "MONDAY"
    tuesday = "TUESDAY"
    wednesday = "WEDNESDAY"

    # ------------------------------------------------------------------
    # Professors
    # ------------------------------------------------------------------

    professors = [1, 2, 3]

    # ------------------------------------------------------------------
    # Subject Offerings
    # ------------------------------------------------------------------

    offerings = [10, 20, 30, 40]

    # ------------------------------------------------------------------
    # Classrooms
    # ------------------------------------------------------------------

    rooms = [100, 200]

    # ------------------------------------------------------------------
    # TimeSlots
    # ------------------------------------------------------------------

    slots = [1001,1002,1003,2001,2002,2003,3001,3002]

    time_slots_by_day = {
        monday:    [1001,1002,1003],
        tuesday:   [2001,2002,2003],
        wednesday: [3001,3002],
    }

    slot_position = {
        1001:1,
        1002:2,
        1003:3,
        2001:1,
        2002:2,
        2003:3,
        3001:1,
        3002:2,
    }

    slot_day = {
        1001:monday,
        1002:monday,
        1003:monday,
        2001:tuesday,
        2002:tuesday,
        2003:tuesday,
        3001:wednesday,
        3002:wednesday,
    }

    # ------------------------------------------------------------------
    # Qualifications
    # ------------------------------------------------------------------

    qualifications = {

        (1,10),
        (1,20),

        (2,20),
        (2,30),

        (3,30),
        (3,40),
    }

    # ------------------------------------------------------------------
    # Availabilities
    # ------------------------------------------------------------------

    availabilities = {

        *( (1,s) for s in slots ),

        *( (2,s) for s in slots if s != 1003 ),

        *( (3,s) for s in slots if s not in (1001,2001) )
    }

    # ------------------------------------------------------------------
    # Weekly workload
    # ------------------------------------------------------------------

    required = {

        10:2,
        20:2,
        30:2,
        40:1,
    }

    # ------------------------------------------------------------------
    # Students
    # ------------------------------------------------------------------

    expected = {

        10:25,
        20:35,
        30:20,
        40:15,
    }

    # ------------------------------------------------------------------
    # Rooms
    # ------------------------------------------------------------------

    capacities = {

        100:30,
        200:50,
    }

    # ------------------------------------------------------------------
    # Student conflicts
    # ------------------------------------------------------------------

    conflicts = {

        (10,20),
        (20,10),

        (30,40),
        (40,30),
    }

    data = SolverData(

        professors=professors,

        subject_offerings=offerings,

        classrooms=rooms,

        time_slots=slots,

        time_slots_by_day=time_slots_by_day,

        slot_position=slot_position,

        slot_day=slot_day,

        valid_qualifications=qualifications,

        valid_availabilities=availabilities,

        required_time_slots=required,

        expected_students=expected,

        classroom_capacity=capacities,

        conflicts=conflicts,
    )

    response = solve_scheduling_problem(
        data,
        debug_mode=False
    )

    assert response is not None

    entries = response.schedule_entries

    # ==========================================================
    # 1. Every offering has the required number of lectures
    # ==========================================================

    for offering in offerings:

        assert sum(
            e.subject_offering_id == offering
            for e in entries
        ) == required[offering]

    # ==========================================================
    # 2. Same professor for every offering
    # ==========================================================

    for offering in offerings:

        professors_used = {

            e.professor_id

            for e in entries

            if e.subject_offering_id == offering
        }

        assert len(professors_used) == 1

    # ==========================================================
    # 3. Professor collision
    # ==========================================================

    occupied = set()

    for e in entries:

        key = (e.professor_id, e.time_slot_id)

        assert key not in occupied

        occupied.add(key)

    # ==========================================================
    # 4. Classroom collision
    # ==========================================================

    occupied = set()

    for e in entries:

        key = (e.classroom_id, e.time_slot_id)

        assert key not in occupied

        occupied.add(key)

    # ==========================================================
    # 5. Capacity
    # ==========================================================

    for e in entries:

        assert capacities[e.classroom_id] >= expected[e.subject_offering_id]

    # ==========================================================
    # 6. Qualification
    # ==========================================================

    for e in entries:

        assert (

            e.professor_id,
            e.subject_offering_id

        ) in qualifications

    # ==========================================================
    # 7. Availability
    # ==========================================================

    for e in entries:

        assert (

            e.professor_id,
            e.time_slot_id

        ) in availabilities

    # ==========================================================
    # 8. Student conflicts
    # ==========================================================

    by_slot = {}

    for e in entries:

        by_slot.setdefault(
            e.time_slot_id,
            []
        ).append(e.subject_offering_id)

    for slot_offerings in by_slot.values():

        for i in range(len(slot_offerings)):

            for j in range(i+1, len(slot_offerings)):

                assert (

                    slot_offerings[i],
                    slot_offerings[j]

                ) not in conflicts