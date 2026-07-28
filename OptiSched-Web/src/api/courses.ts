import { httpClient } from "@/api/http-client";
import type { Course, CourseInput } from "@/types/Course";

export async function listCourses(institutionId: number): Promise<Course[]> {
  const { data } = await httpClient.get<Course[]>("/courses", {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function createCourse(input: CourseInput, institutionId: number): Promise<Course> {
  const { data } = await httpClient.post<Course>("/courses", input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function updateCourse(
  id: number,
  input: CourseInput,
  institutionId: number
): Promise<Course> {
  const { data } = await httpClient.put<Course>(`/courses/${id}`, input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function deleteCourse(id: number, institutionId: number): Promise<void> {
  await httpClient.delete(`/courses/${id}`, {
    params: { institutionIdSuperAdmin: institutionId },
  });
}
