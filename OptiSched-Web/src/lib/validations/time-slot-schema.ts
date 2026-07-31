import { z } from "zod";
import i18next from "@/i18n/i18n";

const t = (key: string) => i18next.t(key, { ns: "validations" });

export const timeSlotSchema = z.object({
  dayOfWeek: z.enum([
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ]),
  startTime: z.string().min(1, t("timeSlot.startTimeRequired")),
  endTime: z.string().min(1, t("timeSlot.endTimeRequired")),
});

export type TimeSlotFormValues = z.infer<typeof timeSlotSchema>;
