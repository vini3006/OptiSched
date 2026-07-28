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
