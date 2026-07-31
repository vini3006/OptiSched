import { z } from "zod";
import i18next from "@/i18n/i18n";

const t = (key: string) => i18next.t(key, { ns: "validations" });

export const professorQualificationSchema = z.object({
  professorId: z.number().int().positive(t("professorQualification.professorRequired")),
  subjectId: z.number().int().positive(t("professorQualification.subjectRequired")),
});

export type ProfessorQualificationFormValues = z.infer<typeof professorQualificationSchema>;
