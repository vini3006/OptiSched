import { z } from "zod";

export const institutionSchema = z.object({
  name: z.string().min(1, "Informe o nome da instituição."),
  cnpj: z
    .string()
    .min(1, "Informe o CNPJ.")
    .regex(/^\d{14}$/, "O CNPJ deve conter exatamente 14 números, sem pontuação."),
  subscriptionStatus: z.enum(["TRIAL", "ACTIVE", "CANCELED", "UNPAID"]),
  expiresAt: z.string().optional(),
});

export type InstitutionFormValues = z.infer<typeof institutionSchema>;
