import { httpClient } from "@/api/http-client";
import type { SubjectOffering, SubjectOfferingInput } from "@/types/SubjectOffering";

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
