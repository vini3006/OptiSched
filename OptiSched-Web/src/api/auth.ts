import { isAxiosError } from "axios";

import { httpClient } from "@/api/http-client";
import type { AuthUser, LoginCredentials } from "@/types/Auth";

export const AUTH_QUERY_KEY = ["auth", "me"] as const;

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data } = await httpClient.get<AuthUser>("/auth/me");
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function login(credentials: LoginCredentials): Promise<AuthUser> {
  const { data } = await httpClient.post<AuthUser>("/auth/login", credentials);
  return data;
}

export async function logout(): Promise<void> {
  await httpClient.post("/auth/logout");
}
