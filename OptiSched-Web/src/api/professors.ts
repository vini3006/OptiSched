import { httpClient } from "@/api/http-client";
import type { Professor, ProfessorInput } from "@/types/Professor";
import type { ImportResult } from "@/types/ImportResult";

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

export async function importProfessorsCsv(file: File, institutionId: number): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await httpClient.post<ImportResult>("/users/professors/import", formData, {
    params: { institutionIdSuperAdmin: institutionId },
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function exportProfessorsCsv(institutionId: number): Promise<Blob> {
  const { data } = await httpClient.get<Blob>("/professors/export", {
    params: { institutionIdSuperAdmin: institutionId },
    responseType: "blob",
  });
  return data;
}
