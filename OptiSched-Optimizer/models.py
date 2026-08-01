from datetime import time
from pydantic import BaseModel
from enums import DayOfWeek, RoomType

# =========================
# Input DTOs
# =========================

class Professor(BaseModel):
    id: int
    qualified_subject_ids: list[int]
    available_time_slot_ids: list[int]
    max_daily_time_slots: int | None = None
    max_weekly_time_slots: int | None = None

class SubjectOffering(BaseModel):
    id: int
    subject_id: int
    course_id: int

    required_time_slots: int
    expected_students: int
    recommended_semester: int
    required_room_type: RoomType | None = None
    # TimeSlot ids this offering is hard-restricted to (e.g. its course's
    # mandatory shift). None means no restriction — any TimeSlot the
    # professor/room/etc. otherwise allow is fair game. Unlike
    # preferred_time_slot_ids (soft, whole-request), this is per-offering
    # and enforced by never creating the x variable outside the window.
    allowed_time_slot_ids: list[int] | None = None
    # When true, this offering's Subject supports co-teaching: more than one
    # professor may cover it across the semester (e.g. theory taught by one,
    # lab by another) — relaxes C2 (unique professor assignment) just for
    # this offering. Defaults to false, preserving the single-professor rule.
    allows_multiple_professors: bool = False

class Classroom(BaseModel):
    id: int
    capacity: int
    type: RoomType

class TimeSlot(BaseModel):
    id: int
    day_of_week: DayOfWeek
    start_time: time
    end_time: time

class ObjectiveWeightsDTO(BaseModel):
    alpha: float = 1.0
    beta: float = 1.0
    gamma: float = 1.0
    delta: float = 1.0
    epsilon: float = 0.0

class LockedAssignment(BaseModel):
    subject_offering_id: int
    professor_id: int
    classroom_id: int
    time_slot_id: int

class OptimizationRequest(BaseModel):
    professors: list[Professor]
    subject_offerings: list[SubjectOffering]
    classrooms: list[Classroom]
    time_slots: list[TimeSlot]
    objective_weights: ObjectiveWeightsDTO = ObjectiveWeightsDTO()
    preferred_time_slot_ids: list[int] = []
    locked_assignments: list[LockedAssignment] = []
    # Overrides the solver's default time budget (solver/solver.py's
    # SOLVE_TIME_LIMIT_SECONDS) for this request only. None uses the default.
    solver_time_limit_seconds: float | None = None

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
