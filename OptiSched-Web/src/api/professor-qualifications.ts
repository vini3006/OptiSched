import { httpClient } from "@/api/http-client";
import type {
  ProfessorQualification,
  ProfessorQualificationInput,
} from "@/types/ProfessorQualification";

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
