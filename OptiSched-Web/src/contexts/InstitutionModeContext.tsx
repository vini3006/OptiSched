import { useCallback, useMemo, useState, type ReactNode } from "react";

import {
  InstitutionModeContext,
  type InstitutionModeContextValue,
} from "@/contexts/institution-mode-context-value";
import type { InstitutionType } from "@/types/Institution";

const STORAGE_KEY = "optisched.institutionMode";

function readInitialValue(): InstitutionType {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "SCHOOL" ? "SCHOOL" : "UNIVERSITY";
}

export function InstitutionModeProvider({ children }: { children: ReactNode }) {
  const [institutionMode, setInstitutionModeState] = useState<InstitutionType>(readInitialValue);

  const setInstitutionMode = useCallback((mode: InstitutionType) => {
    setInstitutionModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  const value = useMemo<InstitutionModeContextValue>(
    () => ({ institutionMode, setInstitutionMode }),
    [institutionMode, setInstitutionMode]
  );

  return (
    <InstitutionModeContext.Provider value={value}>{children}</InstitutionModeContext.Provider>
  );
}
