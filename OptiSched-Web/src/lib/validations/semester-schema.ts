import { z } from "zod";
import i18next from "@/i18n/i18n";

const t = (key: string) => i18next.t(key, { ns: "validations" });

export const semesterSchema = z
  .object({
    year: z.number().int().min(2000).max(2100),
    term: z.enum(["FIRST", "SECOND"]),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate > data.startDate, {
    message: t("semester.endDateAfterStartDate"),
    path: ["endDate"],
  });

export type SemesterFormValues = z.infer<typeof semesterSchema>;
