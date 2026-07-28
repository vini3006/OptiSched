import { httpClient } from "@/api/http-client";
import type { Professor, ProfessorInput } from "@/types/Professor";

export async function listProfessors(institutionId: number): Promise<Professor[]> {
  const { data } = await httpClient.get<Professor[]>("/professors", {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function updateProfessor(
  id: number,
  input: ProfessorInput,
  institutionId: number
): Promise<Professor> {
  const { data } = await httpClient.put<Professor>(`/professors/${id}`, input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function deleteProfessor(id: number, institutionId: number): Promise<void> {
  await httpClient.delete(`/professors/${id}`, {
    params: { institutionIdSuperAdmin: institutionId },
  });
}
