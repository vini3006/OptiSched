import { httpClient } from "@/api/http-client";
import type { CreateUserInput, ManagedUser } from "@/types/User";

export async function createSuperAdmin(input: CreateUserInput): Promise<ManagedUser> {
  const { data } = await httpClient.post<ManagedUser>("/users/super-admin", input);
  return data;
}

export async function createAdmin(
  input: CreateUserInput,
  institutionId: number
): Promise<ManagedUser> {
  const { data } = await httpClient.post<ManagedUser>("/users/admin", input, {
    params: { institutionId },
  });
  return data;
}

export async function createProfessor(
  input: CreateUserInput,
  institutionId: number
): Promise<ManagedUser> {
  const { data } = await httpClient.post<ManagedUser>("/users/professors", input, {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function listUsers(institutionId: number): Promise<ManagedUser[]> {
  const { data } = await httpClient.get<ManagedUser[]>("/users", {
    params: { institutionIdSuperAdmin: institutionId },
  });
  return data;
}

export async function deleteUser(id: number, institutionId: number): Promise<void> {
  await httpClient.delete(`/users/${id}`, {
    params: { institutionIdSuperAdmin: institutionId },
  });
}
