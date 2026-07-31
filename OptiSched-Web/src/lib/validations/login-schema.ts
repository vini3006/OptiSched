import { z } from "zod";
import i18next from "@/i18n/i18n";

const t = (key: string) => i18next.t(key, { ns: "validations" });

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, t("login.emailRequired"))
    .email({ message: t("login.emailInvalid") }),
  password: z.string().min(1, t("login.passwordRequired")),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
