import { z } from "zod";

export const subjectSchema = z.object({
  code: z.string().min(1, "Informe o código da disciplina."),
  name: z.string().min(1, "Informe o nome da disciplina."),
  workload: z.number().int().positive("Informe uma carga horária válida."),
});

export type SubjectFormValues = z.infer<typeof subjectSchema>;
