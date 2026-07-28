import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1, "Informe o nome."),
  email: z
    .string()
    .min(1, "Informe o e-mail.")
    .email({ message: "Informe um e-mail válido." }),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
