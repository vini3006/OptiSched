import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useInstitutionMode } from "@/hooks/UseInstitutionMode";

export function InstitutionModeToggle() {
  const { t } = useTranslation("appNavBar");
  const { institutionMode, setInstitutionMode } = useInstitutionMode();

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-foreground">{t("institutionModeLabel")}</span>
      <div className="flex gap-1 rounded-lg border border-border/70 p-1">
        <Button
          type="button"
          size="sm"
          variant={institutionMode === "UNIVERSITY" ? "default" : "ghost"}
          onClick={() => setInstitutionMode("UNIVERSITY")}
        >
          {t("institutionModeUniversity")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={institutionMode === "SCHOOL" ? "default" : "ghost"}
          onClick={() => setInstitutionMode("SCHOOL")}
        >
          {t("institutionModeSchool")}
        </Button>
      </div>
    </div>
  );
}
