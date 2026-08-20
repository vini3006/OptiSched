import type { ScheduleEntry } from "@/types/ScheduleEntry";

export type ScheduleStatus = "ACTIVE" | "INACTIVE";

export type Schedule = {
  id: number;
  semesterId: number;
  generatedAt: string;
  status: ScheduleStatus;
  version: number;
  courseId: number | null;
};

export type EntryDiff = {
  subjectOfferingId: number;
  subjectName: string;
  courseName: string | null;
  turmaName: string | null;
  before: ScheduleEntry[];
  after: ScheduleEntry[];
};

export type ScheduleComparison = {
  changed: EntryDiff[];
  onlyInA: ScheduleEntry[];
  onlyInB: ScheduleEntry[];
};

export type PreferredShift = "MORNING" | "AFTERNOON" | "EVENING";

export type ScheduleGenerationOptions = {
  compactSchedule: number;
  weeklyDistribution: number;
  subjectBlocking: number;
  classroomStability: number;
  preferredShift: PreferredShift | null;
  preferredShiftWeight: number | null;
  courseId: number | null;
  solverTimeLimitSeconds: number | null;
};
