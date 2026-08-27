import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, School } from "lucide-react";

import logoFull from "@/assets/logos/logo-full.svg";
import { Button } from "@/components/ui/button";
import { AUTH_QUERY_KEY } from "@/api/auth";
import { createDemoInstitution } from "@/api/demo";
import type { InstitutionType } from "@/types/Institution";

export function DemoPage() {
  const { t } = useTranslation("demo");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pendingType, setPendingType] = useState<InstitutionType | null>(null);

  const createDemoMutation = useMutation({
    mutationFn: createDemoInstitution,
  });

  async function handleChoose(type: InstitutionType) {
    setPendingType(type);
    try {
      const authUser = await createDemoMutation.mutateAsync(type);
      queryClient.setQueryData(AUTH_QUERY_KEY, authUser);
      await navigate({ to: "/admin" });
    } catch {
      // createDemoMutation.isError already renders the error message below.
    }
  }

  const isPending = createDemoMutation.isPending;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex justify-center">
          <img src={logoFull} alt="OptiSched" className="h-48 w-auto" />
        </div>

        <div className="card-elevated rounded-2xl px-6 py-8 sm:px-10 sm:py-10">
          <div className="mb-8 text-center">
            <h1 className="text-xl font-semibold text-primary sm:text-2xl">{t("title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t("description")}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DemoChoiceCard
              icon={<GraduationCap className="size-6" />}
              title={t("university.title")}
              description={t("university.description")}
              cta={t("university.cta")}
              loadingLabel={t("creating")}
              isLoading={isPending && pendingType === "UNIVERSITY"}
              disabled={isPending}
              onChoose={() => handleChoose("UNIVERSITY")}
            />
            <DemoChoiceCard
              icon={<School className="size-6" />}
              title={t("school.title")}
              description={t("school.description")}
              cta={t("school.cta")}
              loadingLabel={t("creating")}
              isLoading={isPending && pendingType === "SCHOOL"}
              disabled={isPending}
              onChoose={() => handleChoose("SCHOOL")}
            />
          </div>

          {createDemoMutation.isError && (
            <p role="alert" className="mt-6 text-center text-sm font-medium text-destructive">
              {t("error")}
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="font-medium text-primary hover:underline">
            {t("backToSite")}
          </Link>
        </p>
      </div>
    </main>
  );
}

function DemoChoiceCard({
  icon,
  title,
  description,
  cta,
  loadingLabel,
  isLoading,
  disabled,
  onChoose,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
  loadingLabel: string;
  isLoading: boolean;
  disabled: boolean;
  onChoose: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-border p-6 text-center">
      <span className="mb-3 inline-flex size-12 items-center justify-center rounded-full bg-secondary text-accent">
        {icon}
      </span>
      <h2 className="text-base font-semibold text-primary">{title}</h2>
      <p className="mt-1.5 mb-5 text-sm text-muted-foreground">{description}</p>
      <Button
        type="button"
        disabled={disabled}
        onClick={onChoose}
        className="btn-gold mt-auto w-full justify-center py-2.5 text-sm font-semibold"
      >
        {isLoading ? loadingLabel : cta}
      </Button>
    </div>
  );
}
