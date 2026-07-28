import { httpClient } from "@/api/http-client";
import type { Availability, AvailabilityInput } from "@/types/Availability";

export async function listAvailabilities(institutionId: number): Promise<Availability[]> {
  const { data } = await httpClient.get<Availability[]>("/availabilities", {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function createAvailability(
  input: AvailabilityInput,
  institutionId: number
): Promise<Availability> {
  const { data } = await httpClient.post<Availability>("/availabilities", input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function deleteAvailability(
  professorId: number,
  timeSlotId: number,
  institutionId: number
): Promise<void> {
  await httpClient.delete("/availabilities", {
    params: { professorId, timeSlotId, institutionIdSuperAdmin: institutionId },
  });
}
