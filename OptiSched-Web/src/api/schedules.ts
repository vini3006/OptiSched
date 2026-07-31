import { isAxiosError } from "axios";

import { httpClient } from "@/api/http-client";
import type { Schedule, ScheduleComparison, ScheduleGenerationOptions } from "@/types/Schedule";

export async function listSchedules(
  institutionId: number,
  semesterId?: number
): Promise<Schedule[]> {
  const { data } = await httpClient.get<Schedule[]>("/schedules", {
    params: { institutionIdSuperAdmin: institutionId, semesterId },
  });
  return data;
}

export async function compareSchedules(
  id: number,
  otherId: number,
  institutionId: number
): Promise<ScheduleComparison> {
  const { data } = await httpClient.get<ScheduleComparison>(`/schedules/${id}/compare/${otherId}`, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function fetchActiveSchedule(institutionId: number): Promise<Schedule | null> {
  try {
    const { data } = await httpClient.get<Schedule>("/schedules/active", {
      params: { institutionIdSuperAdmin: institutionId },
    });
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function generateSchedule(
  semesterId: number,
  options: ScheduleGenerationOptions,
  institutionId: number
): Promise<Schedule> {
  const { data } = await httpClient.post<Schedule>(
    "/schedules/generate",
    {
      compactSchedule: options.compactSchedule,
      weeklyDistribution: options.weeklyDistribution,
      subjectBlocking: options.subjectBlocking,
      classroomStability: options.classroomStability,
      preferredShift: options.preferredShift,
      preferredShiftWeight: options.preferredShiftWeight,
    },
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
