import { z } from "zod";
import i18next from "@/i18n/i18n";

const t = (key: string) => i18next.t(key, { ns: "validations" });

export const courseSchema = z.object({
  name: z.string().min(1, t("course.nameRequired")),
  totalSemesters: z.number().int().positive(t("course.totalSemestersRequired")),
  allowedShift: z.enum(["MORNING", "AFTERNOON", "EVENING"]).nullable(),
});

export type CourseFormValues = z.infer<typeof courseSchema>;
