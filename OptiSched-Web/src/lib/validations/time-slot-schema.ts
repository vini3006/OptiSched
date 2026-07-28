import { z } from "zod";

export const timeSlotSchema = z.object({
  dayOfWeek: z.enum([
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ]),
  startTime: z.string().min(1, "Informe o horário de início."),
  endTime: z.string().min(1, "Informe o horário de término."),
});

export type TimeSlotFormValues = z.infer<typeof timeSlotSchema>;
