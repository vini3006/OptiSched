import { httpClient } from "@/api/http-client";
import type { Turma, TurmaInput } from "@/types/Turma";

export async function listTurmas(institutionId: number): Promise<Turma[]> {
  const { data } = await httpClient.get<Turma[]>("/turmas", {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function createTurma(input: TurmaInput, institutionId: number): Promise<Turma> {
  const { data } = await httpClient.post<Turma>("/turmas", input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function updateTurma(
  id: number,
  input: TurmaInput,
  institutionId: number
): Promise<Turma> {
  const { data } = await httpClient.put<Turma>(`/turmas/${id}`, input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function deleteTurma(id: number, institutionId: number): Promise<void> {
  await httpClient.delete(`/turmas/${id}`, {
    params: { institutionIdSuperAdmin: institutionId },
  });
}
