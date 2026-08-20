import type { DayOfWeek } from "@/types/TimeSlot";

export type ScheduleEntry = {
  id: number;
  scheduleId: number;
  subjectOfferingId: number;
  subjectId: number;
  subjectName: string;
  section: string | null;
  courseId: number | null;
  courseName: string | null;
  turmaId: number | null;
  turmaName: string | null;
  recommendedSemester: number | null;
  professorId: number;
  professorName: string;
  classroomId: number;
  classroomNumber: string;
  timeSlotId: number;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  locked: boolean;
};
