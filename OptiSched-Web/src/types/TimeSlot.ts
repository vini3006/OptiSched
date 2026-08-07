export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type TimeSlot = {
  id: number;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
};

export type TimeSlotInput = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
};

export type TimeSlotGenerationConfig = {
  daysOfWeek: DayOfWeek[];
  dayStart: string;
  dayEnd: string;
  classDurationMinutes: number;
  breaks: { start: string; end: string }[];
};

export type GeneratedTimeSlotItem = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
};
