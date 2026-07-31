import { httpClient } from "@/api/http-client";
import type { Subject, SubjectInput } from "@/types/Subject";
import type { ImportResult } from "@/types/ImportResult";

export async function listSubjects(institutionId: number): Promise<Subject[]> {
  const { data } = await httpClient.get<Subject[]>("/subjects", {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function createSubject(
  input: SubjectInput,
  institutionId: number
): Promise<Subject> {
  const { data } = await httpClient.post<Subject>("/subjects", input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function updateSubject(
  id: number,
  input: SubjectInput,
  institutionId: number
): Promise<Subject> {
  const { data } = await httpClient.put<Subject>(`/subjects/${id}`, input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function deleteSubject(id: number, institutionId: number): Promise<void> {
  await httpClient.delete(`/subjects/${id}`, {
    params: { institutionIdSuperAdmin: institutionId },
  });
}

export async function importSubjectsCsv(file: File, institutionId: number): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await httpClient.post<ImportResult>("/subjects/import", formData, {
    params: { institutionIdSuperAdmin: institutionId },
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function exportSubjectsCsv(institutionId: number): Promise<Blob> {
  const { data } = await httpClient.get<Blob>("/subjects/export", {
    params: { institutionIdSuperAdmin: institutionId },
    responseType: "blob",
  });
  return data;
}
