import { z } from "zod";

export const professorSchema = z.object({
  name: z.string().min(1, "Informe o nome do professor."),
});

export type ProfessorFormValues = z.infer<typeof professorSchema>;
