import { z } from "zod";
import i18next from "@/i18n/i18n";

const t = (key: string) => i18next.t(key, { ns: "validations" });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, t("forgotPassword.emailRequired"))
    .email({ message: t("forgotPassword.emailInvalid") }),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
