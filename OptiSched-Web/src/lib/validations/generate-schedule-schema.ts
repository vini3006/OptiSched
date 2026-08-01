import { z } from "zod";
import i18next from "@/i18n/i18n";

const t = (key: string) => i18next.t(key, { ns: "validations" });

export const generateScheduleSchema = z.object({
  semesterId: z.number().int().positive(t("generateSchedule.semesterRequired")),
  compactSchedule: z.number().min(0).max(10),
  weeklyDistribution: z.number().min(0).max(10),
  subjectBlocking: z.number().min(0).max(10),
  classroomStability: z.number().min(0).max(10),
  preferShift: z.boolean(),
  preferredShift: z.enum(["MORNING", "AFTERNOON", "EVENING"]),
  preferredShiftWeight: z.number().min(0).max(10),
  courseId: z.number().int().positive().nullable(),
  solverTimeLimitSeconds: z.number().min(5).max(300).nullable(),
});

export type GenerateScheduleFormValues = z.infer<typeof generateScheduleSchema>;
