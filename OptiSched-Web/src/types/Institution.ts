export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "CANCELED" | "UNPAID";

export type InstitutionType = "UNIVERSITY" | "SCHOOL";

export type Institution = {
  id: number;
  name: string;
  cnpj: string;
  subscriptionStatus: SubscriptionStatus;
  expiresAt: string | null;
  type: InstitutionType;
};

export type InstitutionInput = {
  name: string;
  cnpj: string;
  subscriptionStatus: SubscriptionStatus;
  expiresAt: string | null;
  type: InstitutionType;
};
