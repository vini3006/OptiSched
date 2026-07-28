import { useContext } from "react";

import { SelectedInstitutionContext } from "@/contexts/selected-institution-context-value";

export function useSelectedInstitution() {
  const context = useContext(SelectedInstitutionContext);

  if (!context) {
    throw new Error("useSelectedInstitution must be used within a SelectedInstitutionProvider");
  }

  return context;
}
