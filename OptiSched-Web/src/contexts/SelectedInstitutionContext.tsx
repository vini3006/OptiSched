import { useMemo, useState, type ReactNode } from "react";

import {
  SelectedInstitutionContext,
  type SelectedInstitutionContextValue,
} from "@/contexts/selected-institution-context-value";

const STORAGE_KEY = "optisched.selectedInstitutionId";

function readInitialValue(): number | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? Number(stored) : null;
}

export function SelectedInstitutionProvider({ children }: { children: ReactNode }) {
  const [selectedInstitutionId, setSelectedInstitutionIdState] = useState<number | null>(
    readInitialValue
  );

  function setSelectedInstitutionId(institutionId: number | null) {
    setSelectedInstitutionIdState(institutionId);

    if (institutionId === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(institutionId));
    }
  }

  const value = useMemo<SelectedInstitutionContextValue>(
    () => ({ selectedInstitutionId, setSelectedInstitutionId }),
    [selectedInstitutionId]
  );

  return (
    <SelectedInstitutionContext.Provider value={value}>
      {children}
    </SelectedInstitutionContext.Provider>
  );
}
