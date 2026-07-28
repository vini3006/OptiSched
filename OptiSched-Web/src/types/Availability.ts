import type { DayOfWeek } from "@/types/TimeSlot";

export type Availability = {
  professorId: number;
  professorName: string;
  timeSlotId: number;
  timeSlotDayOfWeek: DayOfWeek;
  timeSlotStartTime: string;
  timeSlotEndTime: string;
};

export type AvailabilityInput = {
  professorId: number;
  timeSlotId: number;
};
