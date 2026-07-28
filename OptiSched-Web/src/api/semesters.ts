import { httpClient } from "@/api/http-client";
import type { Semester, SemesterInput } from "@/types/Semester";

export async function listSemesters(institutionId: number): Promise<Semester[]> {
  const { data } = await httpClient.get<Semester[]>("/semesters", {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function createSemester(
  input: SemesterInput,
  institutionId: number
): Promise<Semester> {
  const { data } = await httpClient.post<Semester>("/semesters", input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function updateSemester(
  id: number,
  input: SemesterInput,
  institutionId: number
): Promise<Semester> {
  const { data } = await httpClient.put<Semester>(`/semesters/${id}`, input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function deleteSemester(id: number, institutionId: number): Promise<void> {
  await httpClient.delete(`/semesters/${id}`, {
    params: { institutionIdSuperAdmin: institutionId },
  });
}
