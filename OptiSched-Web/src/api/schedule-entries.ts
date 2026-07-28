import { httpClient } from "@/api/http-client";
import type { ScheduleEntry } from "@/types/ScheduleEntry";

export async function listScheduleEntries(
  scheduleId: number,
  institutionId: number
): Promise<ScheduleEntry[]> {
  const { data } = await httpClient.get<ScheduleEntry[]>("/schedule-entries", {
    params: { scheduleId, institutionIdSuperAdmin: institutionId },
  });
  return data;
}
