import { z } from "zod";
import i18next from "@/i18n/i18n";

const t = (key: string) => i18next.t(key, { ns: "validations" });

export const createUserSchema = z.object({
  name: z.string().min(1, t("user.nameRequired")),
  email: z
    .string()
    .min(1, t("user.emailRequired"))
    .email({ message: t("user.emailInvalid") }),
  password: z.string().min(6, t("user.passwordMinLength")),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
