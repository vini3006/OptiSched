import { useContext } from "react";

import { InstitutionModeContext } from "@/contexts/institution-mode-context-value";

export function useInstitutionMode() {
  const context = useContext(InstitutionModeContext);

  if (!context) {
    throw new Error("useInstitutionMode must be used within an InstitutionModeProvider");
  }

  return context;
}
