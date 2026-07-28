import { httpClient } from "@/api/http-client";
import type { Subject, SubjectInput } from "@/types/Subject";

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
