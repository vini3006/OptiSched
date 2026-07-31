import { httpClient } from "@/api/http-client";
import type {
  ProfessorQualification,
  ProfessorQualificationInput,
} from "@/types/ProfessorQualification";
import type { ImportResult } from "@/types/ImportResult";

export async function listQualifications(
  institutionId: number
): Promise<ProfessorQualification[]> {
  const { data } = await httpClient.get<ProfessorQualification[]>("/qualifications", {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function createQualification(
  input: ProfessorQualificationInput,
  institutionId: number
): Promise<ProfessorQualification> {
  const { data } = await httpClient.post<ProfessorQualification>("/qualifications", input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function deleteQualification(
  professorId: number,
  subjectId: number,
  institutionId: number
): Promise<void> {
  await httpClient.delete("/qualifications", {
    params: { professorId, subjectId, institutionIdSuperAdmin: institutionId },
  });
}

export async function importQualificationsCsv(file: File, institutionId: number): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await httpClient.post<ImportResult>("/qualifications/import", formData, {
    params: { institutionIdSuperAdmin: institutionId },
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function exportQualificationsCsv(institutionId: number): Promise<Blob> {
  const { data } = await httpClient.get<Blob>("/qualifications/export", {
    params: { institutionIdSuperAdmin: institutionId },
    responseType: "blob",
  });
  return data;
}
