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

export type ScheduleEntryUpdateInput = {
  professorId: number;
  classroomId: number;
  timeSlotId: number;
};

export async function updateScheduleEntry(
  id: number,
  input: ScheduleEntryUpdateInput,
  institutionId: number
): Promise<ScheduleEntry> {
  const { data } = await httpClient.patch<ScheduleEntry>(`/schedule-entries/${id}`, input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function deleteScheduleEntry(id: number, institutionId: number): Promise<void> {
  await httpClient.delete(`/schedule-entries/${id}`, {
    params: { institutionIdSuperAdmin: institutionId },
  });
}

export async function toggleScheduleEntryLocked(
  id: number,
  institutionId: number
): Promise<ScheduleEntry> {
  const { data } = await httpClient.patch<ScheduleEntry>(`/schedule-entries/${id}/locked`, undefined, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function moveScheduleEntry(
  id: number,
  timeSlotId: number,
  institutionId: number
): Promise<ScheduleEntry[]> {
  const { data } = await httpClient.patch<ScheduleEntry[]>(
    `/schedule-entries/${id}/move`,
    { timeSlotId },
    { params: { institutionIdSuperAdmin: institutionId } }
  );
  return data;
}
