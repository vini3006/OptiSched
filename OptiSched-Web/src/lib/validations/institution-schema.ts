import { z } from "zod";
import i18next from "@/i18n/i18n";

const t = (key: string) => i18next.t(key, { ns: "validations" });

export const institutionSchema = z.object({
  name: z.string().min(1, t("institution.nameRequired")),
  cnpj: z
    .string()
    .min(1, t("institution.cnpjRequired"))
    .regex(/^\d{14}$/, t("institution.cnpjInvalid")),
  subscriptionStatus: z.enum(["TRIAL", "ACTIVE", "CANCELED", "UNPAID"]),
  expiresAt: z.string().optional(),
  type: z.enum(["UNIVERSITY", "SCHOOL"]),
});

export type InstitutionFormValues = z.infer<typeof institutionSchema>;
