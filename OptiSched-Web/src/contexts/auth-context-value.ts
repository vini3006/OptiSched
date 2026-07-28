import { createContext } from "react";

import type { AuthUser, LoginCredentials } from "@/types/Auth";

export type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
