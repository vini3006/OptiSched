import { z } from "zod";
import i18next from "@/i18n/i18n";

const t = (key: string) => i18next.t(key, { ns: "validations" });

const optionalPositiveInt = z
  .number()
  .int()
  .positive(t("professor.positiveNumberInvalid"))
  .nullable();

export const professorSchema = z.object({
  name: z.string().min(1, t("professor.nameRequired")),
  maxDailyTimeSlots: optionalPositiveInt,
  maxWeeklyTimeSlots: optionalPositiveInt,
});

export type ProfessorFormValues = z.infer<typeof professorSchema>;
