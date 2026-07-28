import { z } from "zod";

export const classroomSchema = z.object({
  number: z.string().min(1, "Informe o número da sala.").max(20),
  capacity: z.number().int().positive("Informe uma capacidade válida."),
});

export type ClassroomFormValues = z.infer<typeof classroomSchema>;
