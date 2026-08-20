import { httpClient } from "@/api/http-client";
import type { SerieSubject, SerieSubjectInput } from "@/types/SerieSubject";

export async function listSerieSubjects(institutionId: number): Promise<SerieSubject[]> {
  const { data } = await httpClient.get<SerieSubject[]>("/serie-subjects", {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function createSerieSubject(
  input: SerieSubjectInput,
  institutionId: number
): Promise<SerieSubject> {
  const { data } = await httpClient.post<SerieSubject>("/serie-subjects", input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function deleteSerieSubject(
  serieId: number,
  subjectId: number,
  institutionId: number
): Promise<void> {
  await httpClient.delete("/serie-subjects", {
    params: { serieId, subjectId, institutionIdSuperAdmin: institutionId },
  });
}
