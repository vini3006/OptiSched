import { z } from "zod";
import i18next from "@/i18n/i18n";

const t = (key: string) => i18next.t(key, { ns: "validations" });

export const subjectSchema = z.object({
  code: z.string().min(1, t("subject.codeRequired")),
  name: z.string().min(1, t("subject.nameRequired")),
  workload: z.number().int().positive(t("subject.workloadInvalid")),
  requiredRoomType: z.enum(["COMMON", "LABORATORY"]).nullable(),
});

export type SubjectFormValues = z.infer<typeof subjectSchema>;
