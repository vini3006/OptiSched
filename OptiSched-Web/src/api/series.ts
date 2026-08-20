import { httpClient } from "@/api/http-client";
import type { Serie, SerieInput } from "@/types/Serie";

export async function listSeries(institutionId: number): Promise<Serie[]> {
  const { data } = await httpClient.get<Serie[]>("/series", {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function createSerie(input: SerieInput, institutionId: number): Promise<Serie> {
  const { data } = await httpClient.post<Serie>("/series", input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function updateSerie(
  id: number,
  input: SerieInput,
  institutionId: number
): Promise<Serie> {
  const { data } = await httpClient.put<Serie>(`/series/${id}`, input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function deleteSerie(id: number, institutionId: number): Promise<void> {
  await httpClient.delete(`/series/${id}`, {
    params: { institutionIdSuperAdmin: institutionId },
  });
}
