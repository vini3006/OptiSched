import { z } from "zod";
import i18next from "@/i18n/i18n";

const t = (key: string) => i18next.t(key, { ns: "validations" });

export const scheduleEntrySchema = z.object({
  professorId: z.number().int().positive(t("scheduleEntry.professorRequired")),
  classroomId: z.number().int().positive(t("scheduleEntry.classroomRequired")),
  timeSlotId: z.number().int().positive(t("scheduleEntry.timeSlotRequired")),
});

export type ScheduleEntryFormValues = z.infer<typeof scheduleEntrySchema>;
