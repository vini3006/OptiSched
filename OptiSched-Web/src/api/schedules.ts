import { httpClient } from "@/api/http-client";
import type { Schedule } from "@/types/Schedule";

export async function listSchedules(institutionId: number): Promise<Schedule[]> {
  const { data } = await httpClient.get<Schedule[]>("/schedules", {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function generateSchedule(
  semesterId: number,
  institutionId: number
): Promise<Schedule> {
  const { data } = await httpClient.post<Schedule>(
    "/schedules/generate",
    {},
    { params: { semesterId, institutionIdSuperAdmin: institutionId } }
  );
  return data;
}

export async function toggleScheduleStatus(
  id: number,
  institutionId: number
): Promise<Schedule> {
  const { data } = await httpClient.patch<Schedule>(`/schedules/${id}/status`, undefined, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function deleteSchedule(id: number, institutionId: number): Promise<void> {
  await httpClient.delete(`/schedules/${id}`, {
    params: { institutionIdSuperAdmin: institutionId },
  });
}
