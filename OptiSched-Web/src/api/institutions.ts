import { httpClient } from "@/api/http-client";
import type { Institution, InstitutionInput } from "@/types/Institution";

export async function listInstitutions(): Promise<Institution[]> {
  const { data } = await httpClient.get<Institution[]>("/institutions");
  return data;
}

export async function getInstitution(id: number): Promise<Institution> {
  const { data } = await httpClient.get<Institution>(`/institutions/${id}`);
  return data;
}

export async function createInstitution(input: InstitutionInput): Promise<Institution> {
  const { data } = await httpClient.post<Institution>("/institutions", input);
  return data;
}

export async function updateInstitution(
  id: number,
  input: InstitutionInput
): Promise<Institution> {
  const { data } = await httpClient.put<Institution>(`/institutions/${id}`, input);
  return data;
}

export async function deleteInstitution(id: number): Promise<void> {
  await httpClient.delete(`/institutions/${id}`);
}
