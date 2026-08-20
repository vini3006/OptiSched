import { z } from "zod";
import i18next from "@/i18n/i18n";

const t = (key: string) => i18next.t(key, { ns: "validations" });

export const serieSubjectSchema = z.object({
  serieId: z.number().int().positive(t("serieSubject.serieRequired")),
  subjectId: z.number().int().positive(t("serieSubject.subjectRequired")),
  weeklyWorkload: z.number().int().positive(t("serieSubject.weeklyWorkloadInvalid")),
});

export type SerieSubjectFormValues = z.infer<typeof serieSubjectSchema>;
