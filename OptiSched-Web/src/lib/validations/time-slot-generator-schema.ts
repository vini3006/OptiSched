import { z } from "zod";
import i18next from "@/i18n/i18n";

const t = (key: string) => i18next.t(key, { ns: "validations" });

const dayOfWeekEnum = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

const breakSchema = z
  .object({
    start: z.string().min(1, t("timeSlotGenerator.breakStartRequired")),
    end: z.string().min(1, t("timeSlotGenerator.breakEndRequired")),
  })
  .refine((data) => !data.start || !data.end || data.end > data.start, {
    message: t("timeSlotGenerator.breakEndAfterStart"),
    path: ["end"],
  });

export const timeSlotGeneratorSchema = z
  .object({
    daysOfWeek: z.array(dayOfWeekEnum).min(1, t("timeSlotGenerator.daysOfWeekRequired")),
    dayStart: z.string().min(1, t("timeSlotGenerator.dayStartRequired")),
    dayEnd: z.string().min(1, t("timeSlotGenerator.dayEndRequired")),
    classDurationMinutes: z
      .number({ message: t("timeSlotGenerator.classDurationRequired") })
      .int()
      .min(5, t("timeSlotGenerator.classDurationMin")),
    breaks: z.array(breakSchema),
  })
  .refine((data) => !data.dayStart || !data.dayEnd || data.dayEnd > data.dayStart, {
    message: t("timeSlotGenerator.dayEndAfterStart"),
    path: ["dayEnd"],
  })
  .refine(
    (data) =>
      data.breaks.every(
        (b) => (!b.start || b.start >= data.dayStart) && (!b.end || b.end <= data.dayEnd)
      ),
    {
      message: t("timeSlotGenerator.breakWithinDay"),
      path: ["breaks"],
    }
  );

export type TimeSlotGeneratorFormValues = z.infer<typeof timeSlotGeneratorSchema>;
