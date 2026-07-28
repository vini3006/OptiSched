export type UserRole = "SUPER_ADMIN" | "ADMIN" | "PROFESSOR";

export type AuthUser = {
  userId: number;
  email: string;
  role: UserRole;
  institutionId: number | null;
  professorId: number | null;
};

export type LoginCredentials = {
  email: string;
  password: string;
};
