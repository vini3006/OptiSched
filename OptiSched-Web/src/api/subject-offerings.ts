import { httpClient } from "@/api/http-client";
import type { SubjectOffering, SubjectOfferingInput } from "@/types/SubjectOffering";
import type { ImportResult } from "@/types/ImportResult";

export async function listSubjectOfferings(institutionId: number): Promise<SubjectOffering[]> {
  const { data } = await httpClient.get<SubjectOffering[]>("/subject-offerings", {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function createSubjectOffering(
  input: SubjectOfferingInput,
  institutionId: number
): Promise<SubjectOffering> {
  const { data } = await httpClient.post<SubjectOffering>("/subject-offerings", input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function updateSubjectOffering(
  id: number,
  input: SubjectOfferingInput,
  institutionId: number
): Promise<SubjectOffering> {
  const { data } = await httpClient.put<SubjectOffering>(`/subject-offerings/${id}`, input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function deleteSubjectOffering(id: number, institutionId: number): Promise<void> {
  await httpClient.delete(`/subject-offerings/${id}`, {
    params: { institutionIdSuperAdmin: institutionId },
  });
}

export async function importSubjectOfferingsCsv(file: File, institutionId: number): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await httpClient.post<ImportResult>("/subject-offerings/import", formData, {
    params: { institutionIdSuperAdmin: institutionId },
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function exportSubjectOfferingsCsv(institutionId: number): Promise<Blob> {
  const { data } = await httpClient.get<Blob>("/subject-offerings/export", {
    params: { institutionIdSuperAdmin: institutionId },
    responseType: "blob",
  });
  return data;
}
