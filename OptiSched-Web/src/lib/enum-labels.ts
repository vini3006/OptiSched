import type { DayOfWeek } from "@/types/TimeSlot";
import type { Term } from "@/types/Semester";
import type { SubscriptionStatus } from "@/types/Institution";

export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Segunda-feira",
  TUESDAY: "Terça-feira",
  WEDNESDAY: "Quarta-feira",
  THURSDAY: "Quinta-feira",
  FRIDAY: "Sexta-feira",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

export const DAY_OF_WEEK_ORDER: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export const TERM_LABELS: Record<Term, string> = {
  FIRST: "1º Semestre",
  SECOND: "2º Semestre",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIAL: "Trial",
  ACTIVE: "Ativo",
  CANCELED: "Cancelado",
  UNPAID: "Inadimplente",
};
