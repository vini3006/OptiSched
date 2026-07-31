import { httpClient } from "@/api/http-client";
import type { TimeSlot, TimeSlotInput } from "@/types/TimeSlot";
import type { ImportResult } from "@/types/ImportResult";

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

export async function importTimeSlotsCsv(file: File, institutionId: number): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await httpClient.post<ImportResult>("/time-slots/import", formData, {
    params: { institutionIdSuperAdmin: institutionId },
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function exportTimeSlotsCsv(institutionId: number): Promise<Blob> {
  const { data } = await httpClient.get<Blob>("/time-slots/export", {
    params: { institutionIdSuperAdmin: institutionId },
    responseType: "blob",
  });
  return data;
}
