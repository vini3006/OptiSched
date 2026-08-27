import type { InstitutionType } from "@/types/Institution";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "PROFESSOR";

export type AuthUser = {
  userId: number;
  email: string;
  name: string;
  role: UserRole;
  institutionId: number | null;
  professorId: number | null;
  institutionType: InstitutionType | null;
  isDemo: boolean;
};

export type LoginCredentials = {
  email: string;
  password: string;
};
