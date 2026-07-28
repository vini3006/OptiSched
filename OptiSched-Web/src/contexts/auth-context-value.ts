import { createContext } from "react";

import type { AuthUser, LoginCredentials } from "@/types/Auth";

export type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isLoggingIn: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
