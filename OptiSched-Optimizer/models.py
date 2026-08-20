from datetime import time
from pydantic import BaseModel, Field
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
    # course_id/recommended_semester (UNIVERSITY mode) and turma_id (SCHOOL
    # mode) are mutually exclusive — exactly one of course_id/turma_id is
    # set per offering, enforced upstream by the Java API. Both may be None
    # here only because pydantic requires a default for optional fields.
    course_id: int | None = None
    turma_id: int | None = None

    required_time_slots: int
    expected_students: int
    recommended_semester: int | None = None
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
    # Upper bounds sized well above any real institution (see solver.py's
    # own "dozens of professors/offerings/rooms" comment) but low enough to
    # reject a payload built to blow up the MILP's variable count before it
    # ever reaches the solver's own time limit.
    professors: list[Professor] = Field(max_length=2000)
    subject_offerings: list[SubjectOffering] = Field(max_length=5000)
    classrooms: list[Classroom] = Field(max_length=2000)
    time_slots: list[TimeSlot] = Field(max_length=500)
    objective_weights: ObjectiveWeightsDTO = ObjectiveWeightsDTO()
    preferred_time_slot_ids: list[int] = Field(default=[], max_length=500)
    locked_assignments: list[LockedAssignment] = Field(default=[], max_length=5000)
    # Overrides the solver's default time budget (solver/solver.py's
    # SOLVE_TIME_LIMIT_SECONDS) for this request only. None uses the default.
    # Also capped server-side (api/optimization.py's MAX_SOLVER_TIME_LIMIT_SECONDS)
    # since a client-supplied value alone can't be trusted as an upper bound.
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
