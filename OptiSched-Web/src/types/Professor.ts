export type Professor = {
  id: number;
  name: string;
  maxDailyTimeSlots: number | null;
  maxWeeklyTimeSlots: number | null;
};

export type ProfessorInput = {
  name: string;
  maxDailyTimeSlots: number | null;
  maxWeeklyTimeSlots: number | null;
};
