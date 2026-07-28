export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "CANCELED" | "UNPAID";

export type Institution = {
  id: number;
  name: string;
  cnpj: string;
  subscriptionStatus: SubscriptionStatus;
  expiresAt: string | null;
};

export type InstitutionInput = {
  name: string;
  cnpj: string;
  subscriptionStatus: SubscriptionStatus;
  expiresAt: string | null;
};
