import { z } from "zod";

export const generateScheduleSchema = z.object({
  semesterId: z.number().int().positive("Selecione um semestre."),
});

export type GenerateScheduleFormValues = z.infer<typeof generateScheduleSchema>;
