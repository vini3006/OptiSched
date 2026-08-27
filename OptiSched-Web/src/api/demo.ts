import { httpClient } from "@/api/http-client";
import type { AuthUser } from "@/types/Auth";
import type { InstitutionType } from "@/types/Institution";

export async function createDemoInstitution(type: InstitutionType): Promise<AuthUser> {
  const { data } = await httpClient.post<AuthUser>("/demo/institutions", { type });
  return data;
}
