import { z } from "zod";

export const professorQualificationSchema = z.object({
  professorId: z.number().int().positive("Selecione um professor."),
  subjectId: z.number().int().positive("Selecione uma disciplina."),
});

export type ProfessorQualificationFormValues = z.infer<typeof professorQualificationSchema>;
