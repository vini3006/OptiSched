import { z } from "zod";
import i18next from "@/i18n/i18n";

const t = (key: string) => i18next.t(key, { ns: "validations" });

export const classroomSchema = z.object({
  number: z.string().min(1, t("classroom.numberRequired")).max(20),
  capacity: z.number().int().positive(t("classroom.capacityInvalid")),
  type: z.enum(["COMMON", "LABORATORY", "AUDITORIUM", "COMPUTER_LAB"]),
  building: z.string().max(255).nullable(),
});

export type ClassroomFormValues = z.infer<typeof classroomSchema>;
