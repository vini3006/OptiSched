import { z } from "zod";

export const subjectOfferingSchema = z.object({
  courseId: z.number().int().positive("Selecione um curso."),
  subjectId: z.number().int().positive("Selecione uma disciplina."),
  semesterId: z.number().int().positive("Selecione um semestre."),
  section: z.string().min(1, "Informe a turma/seção."),
  expectedStudents: z.number().int().positive("Informe um número de alunos válido."),
  recommendedSemester: z.number().int().min(1, "Informe o período recomendado (mínimo 1)."),
});

export type SubjectOfferingFormValues = z.infer<typeof subjectOfferingSchema>;
