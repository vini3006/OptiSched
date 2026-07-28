import { z } from "zod";

export const courseSchema = z.object({
  name: z.string().min(1, "Informe o nome do curso."),
  totalSemesters: z.number().int().positive("Informe o total de semestres do curso."),
});

export type CourseFormValues = z.infer<typeof courseSchema>;
