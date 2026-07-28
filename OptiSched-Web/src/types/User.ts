import type { UserRole } from "@/types/Auth";

export type ManagedUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
};
