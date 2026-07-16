from datetime import time
from pydantic import BaseModel
from enums import DayOfWeek

# =========================
# Input DTOs
# =========================

class Professor(BaseModel):
    id: int
    qualified_subject_ids: list[int]
    available_time_slot_ids: list[int]

class SubjectOffering(BaseModel):
    id: int
    subject_id: int
    course_id: int

    required_time_slots: int
    expected_students: int
    recommended_semester: int

class Classroom(BaseModel):
    id: int
    capacity: int

class TimeSlot(BaseModel):
    id: int
    day_of_week: DayOfWeek
    start_time: time
    end_time: time

class OptimizationRequest(BaseModel):
    professors: list[Professor]
    subject_offerings: list[SubjectOffering]
    classrooms: list[Classroom]
    time_slots: list[TimeSlot]

# =========================
# Output DTOs
# =========================

class ScheduleEntry(BaseModel):
    subject_offering_id: int
    professor_id: int
    classroom_id: int
    time_slot_id: int

class OptimizationResponse(BaseModel):
    schedule_entries: list[ScheduleEntry]
