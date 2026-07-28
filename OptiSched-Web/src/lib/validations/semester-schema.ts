import { z } from "zod";

export const semesterSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  term: z.enum(["FIRST", "SECOND"]),
});

export type SemesterFormValues = z.infer<typeof semesterSchema>;
