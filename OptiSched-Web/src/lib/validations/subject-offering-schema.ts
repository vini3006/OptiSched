import { z } from "zod";
import i18next from "@/i18n/i18n";

const t = (key: string) => i18next.t(key, { ns: "validations" });

export const subjectOfferingSchema = z.object({
  courseId: z.number().int().positive(t("subjectOffering.courseRequired")),
  subjectId: z.number().int().positive(t("subjectOffering.subjectRequired")),
  semesterId: z.number().int().positive(t("subjectOffering.semesterRequired")),
  section: z.string().min(1, t("subjectOffering.sectionRequired")),
  expectedStudents: z.number().int().positive(t("subjectOffering.expectedStudentsInvalid")),
  recommendedSemester: z.number().int().min(1, t("subjectOffering.recommendedSemesterMin")),
});

export type SubjectOfferingFormValues = z.infer<typeof subjectOfferingSchema>;
