import { useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { httpClient } from "@/api/http-client";
import { AuthContext, type AuthContextValue } from "@/contexts/auth-context-value";
import type { AuthUser, LoginCredentials } from "@/types/Auth";

const AUTH_QUERY_KEY = ["auth", "me"] as const;

async function fetchCurrentUser(): Promise<AuthUser | null> {
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

async function login(credentials: LoginCredentials): Promise<AuthUser> {
  const { data } = await httpClient.post<AuthUser>("/auth/login", credentials);
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (authUser) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, authUser);
    },
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      isLoading,
      isLoggingIn: loginMutation.isPending,
      login: loginMutation.mutateAsync,
    }),
    [user, isLoading, loginMutation.isPending, loginMutation.mutateAsync]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
