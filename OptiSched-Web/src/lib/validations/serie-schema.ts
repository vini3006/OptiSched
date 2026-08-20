import { z } from "zod";
import i18next from "@/i18n/i18n";

const t = (key: string) => i18next.t(key, { ns: "validations" });

export const serieSchema = z.object({
  name: z.string().min(1, t("serie.nameRequired")),
  order: z.number().int().nullable(),
});

export type SerieFormValues = z.infer<typeof serieSchema>;
