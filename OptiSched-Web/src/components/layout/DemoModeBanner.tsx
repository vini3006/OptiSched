import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/UseAuth";

export function DemoModeBanner() {
  const { t } = useTranslation("demo");
  const { logout, isLoggingOut } = useAuth();
  const navigate = useNavigate();

  async function handleExit() {
    await logout();
    await navigate({ to: "/" });
  }

  return (
    <div role="status" className="border-b border-accent/40 bg-secondary">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <span className="inline-flex items-center gap-1.5 text-sm text-primary">
          <Info className="size-4 shrink-0 text-accent" aria-hidden />
          {t("banner.message")}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoggingOut}
          onClick={handleExit}
        >
          {isLoggingOut ? t("banner.exiting") : t("banner.exit")}
        </Button>
      </div>
    </div>
  );
}
