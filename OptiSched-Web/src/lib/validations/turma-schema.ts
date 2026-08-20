import { z } from "zod";
import i18next from "@/i18n/i18n";

const t = (key: string) => i18next.t(key, { ns: "validations" });

export const turmaSchema = z.object({
  name: z.string().min(1, t("turma.nameRequired")),
  shift: z.enum(["MORNING", "AFTERNOON", "EVENING"]).nullable(),
  expectedStudents: z.number().int().positive(t("turma.expectedStudentsInvalid")),
  serieId: z.number().int().positive(t("turma.serieRequired")),
  year: z.number().int().positive(t("turma.yearInvalid")),
});

export type TurmaFormValues = z.infer<typeof turmaSchema>;
