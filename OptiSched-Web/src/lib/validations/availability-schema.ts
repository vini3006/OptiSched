import { z } from "zod";

export const availabilitySchema = z.object({
  professorId: z.number().int().positive("Selecione um professor."),
  timeSlotId: z.number().int().positive("Selecione um horário."),
});

export type AvailabilityFormValues = z.infer<typeof availabilitySchema>;
