import os
import sys

# Garante que o diretório raiz do projeto esteja no path de busca do Python
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from highspy import Highs

from solver import solve_scheduling_problem
from mapper import SolverData  

# ==============================================================================
# SANITY TEST CASES
# ==============================================================================

def test_feasible_minimal_schedule():
    """
    Test 1: Minimal Feasible Scenario.
    One qualified professor, one offering requiring 2 slots, one classroom with 
    enough capacity, and exactly 2 available slots.
    The solver must find an optimal, complete schedule.
    """
    # 1. Define entities and IDs
    prof_id = 1
    offering_id = 10
    room_id = 100
    slot1_id = 1001
    slot2_id = 1002
    
    # We can use a simple string or an mock enum for DayOfWeek, e.g., "MONDAY"
    monday = "MONDAY"

    # 2. Build the SolverData directly matching your dataclass attributes
    data = SolverData(
        professors=[prof_id],
        subject_offerings=[offering_id],
        classrooms=[room_id],
        time_slots=[slot1_id, slot2_id],
        
        # Grouped time slots per day
        time_slots_by_day={
            monday: [slot1_id, slot2_id]
        },
        
        # Positions indexed starting at 1
        slot_position={
            slot1_id: 1,
            slot2_id: 2
        },
        
        slot_day={
            slot1_id: monday,
            slot2_id: monday
        },
        
        # Relationships and requirements
        valid_qualifications={
            (prof_id, offering_id)
        },
        valid_availabilities={
            (prof_id, slot1_id),
            (prof_id, slot2_id)
        },
        required_time_slots={
            offering_id: 2  # Needs exactly 2 lectures
        },
        expected_students={
            offering_id: 30
        },
        classroom_capacity={
            room_id: 40  # Room fits the students (40 >= 30)
        },
        conflicts=set()  # No conflicts in this basic run
    )

    # 3. Run solver
    response = solve_scheduling_problem(data, debug_mode=False)
    
    # 4. Asserts
    assert response is not None, "Solver should have found a feasible solution."
    assert len(response.schedule_entries) == 2, "Solver should have scheduled exactly 2 entries."
    
    # Verify the structure of the returned entries
    for entry in response.schedule_entries:
        assert entry.professor_id == prof_id
        assert entry.classroom_id == room_id
        assert entry.subject_offering_id == offering_id
        assert entry.time_slot_id in [slot1_id, slot2_id]


def test_infeasible_professor_insufficient_availability():
    """
    Test 2: Hard Constraint Violation (Infeasibility).
    An offering requires 3 lectures, but the only qualified professor only 
    has 2 slots of availability. 
    The solver must return None.
    """
    prof_id = 1
    offering_id = 10
    room_id = 100
    slot1_id = 1001
    slot2_id = 1002
    monday = "MONDAY"

    data = SolverData(
        professors=[prof_id],
        subject_offerings=[offering_id],
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
            (prof_id, offering_id)
        },
        valid_availabilities={
            (prof_id, slot1_id),
            (prof_id, slot2_id)
        },
        required_time_slots={
            offering_id: 3  # Demand (3) > Availability (2)
        },
        expected_students={
            offering_id: 30
        },
        classroom_capacity={
            room_id: 40
        },
        conflicts=set()
    )

    # Run solver
    response = solve_scheduling_problem(data, debug_mode=False)
    
    # Assert
    assert response is None, "Solver should fail and return None due to lack of professor hours."