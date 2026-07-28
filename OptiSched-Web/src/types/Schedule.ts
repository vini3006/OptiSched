export type ScheduleStatus = "ACTIVE" | "INACTIVE";

export type Schedule = {
  id: number;
  semesterId: number;
  generatedAt: string;
  status: ScheduleStatus;
};
