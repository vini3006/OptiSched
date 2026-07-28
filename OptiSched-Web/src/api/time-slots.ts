import { httpClient } from "@/api/http-client";
import type { TimeSlot, TimeSlotInput } from "@/types/TimeSlot";

export async function listTimeSlots(institutionId: number): Promise<TimeSlot[]> {
  const { data } = await httpClient.get<TimeSlot[]>("/time-slots", {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function createTimeSlot(
  input: TimeSlotInput,
  institutionId: number
): Promise<TimeSlot> {
  const { data } = await httpClient.post<TimeSlot>("/time-slots", input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function deleteTimeSlot(id: number, institutionId: number): Promise<void> {
  await httpClient.delete(`/time-slots/${id}`, {
    params: { institutionIdSuperAdmin: institutionId },
  });
}
