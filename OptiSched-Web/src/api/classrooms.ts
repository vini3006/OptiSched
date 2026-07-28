import { httpClient } from "@/api/http-client";
import type { Classroom, ClassroomInput } from "@/types/Classroom";

export async function listClassrooms(institutionId: number): Promise<Classroom[]> {
  const { data } = await httpClient.get<Classroom[]>("/classrooms", {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function createClassroom(
  input: ClassroomInput,
  institutionId: number
): Promise<Classroom> {
  const { data } = await httpClient.post<Classroom>("/classrooms", input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function updateClassroom(
  id: number,
  input: ClassroomInput,
  institutionId: number
): Promise<Classroom> {
  const { data } = await httpClient.put<Classroom>(`/classrooms/${id}`, input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function deleteClassroom(id: number, institutionId: number): Promise<void> {
  await httpClient.delete(`/classrooms/${id}`, {
    params: { institutionIdSuperAdmin: institutionId },
  });
}
