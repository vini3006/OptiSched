import { z } from "zod";
import i18next from "@/i18n/i18n";

const t = (key: string) => i18next.t(key, { ns: "validations" });

export const availabilitySchema = z.object({
  professorId: z.number().int().positive(t("availability.professorRequired")),
  timeSlotId: z.number().int().positive(t("availability.timeSlotRequired")),
});

export type AvailabilityFormValues = z.infer<typeof availabilitySchema>;
