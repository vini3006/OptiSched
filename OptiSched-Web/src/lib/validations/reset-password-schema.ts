import { z } from "zod";
import i18next from "@/i18n/i18n";

const t = (key: string) => i18next.t(key, { ns: "validations" });

export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(6, t("resetPassword.newPasswordMinLength")),
    confirmPassword: z.string().min(1, t("resetPassword.confirmPasswordRequired")),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: t("resetPassword.passwordsDontMatch"),
    path: ["confirmPassword"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
