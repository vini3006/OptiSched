import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { getInstitution } from "@/api/institutions";
import { useAuth } from "@/hooks/UseAuth";
import { SUBSCRIPTION_STATUS_LABELS } from "@/lib/enum-labels";

export function MyInstitutionPage() {
  const { t } = useTranslation("adminMyInstitution");
  const { user } = useAuth();
  const institutionId = user?.institutionId ?? null;

  const { data: institution, isLoading } = useQuery({
    queryKey: ["institutions", institutionId],
    queryFn: () => getInstitution(institutionId as number),
    enabled: institutionId !== null,
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-primary">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

      <div className="card-elevated mt-6 max-w-lg rounded-2xl p-6">
        {isLoading && <p className="text-sm text-muted-foreground">{t("common:status.loading")}</p>}

        {!isLoading && !institution && (
          <p className="text-sm text-muted-foreground">{t("loadError")}</p>
        )}

        {institution && (
          <dl className="flex flex-col gap-4">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">{t("labelName")}</dt>
              <dd className="mt-0.5 text-sm font-medium text-foreground">{institution.name}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-muted-foreground">{t("labelCnpj")}</dt>
              <dd className="mt-0.5 text-sm text-foreground">{institution.cnpj}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-muted-foreground">{t("labelSubscriptionStatus")}</dt>
              <dd className="mt-1">
                <Badge variant="outline">
                  {SUBSCRIPTION_STATUS_LABELS[institution.subscriptionStatus]}
                </Badge>
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-muted-foreground">{t("labelExpiresAt")}</dt>
              <dd className="mt-0.5 text-sm text-foreground">
                {institution.expiresAt
                  ? new Date(institution.expiresAt).toLocaleDateString("pt-BR")
                  : "—"}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}
