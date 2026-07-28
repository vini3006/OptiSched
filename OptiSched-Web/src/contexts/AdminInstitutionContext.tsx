import { useMemo, type ReactNode } from "react";

import {
  SelectedInstitutionContext,
  type SelectedInstitutionContextValue,
} from "@/contexts/selected-institution-context-value";
import { useAuth } from "@/hooks/UseAuth";

/**
 * Provides the same institution-scope context used by the Super Admin pages,
 * but fixed to the authenticated Admin's own institution (from the JWT claim)
 * instead of a user-picked one, so those pages can be reused unmodified.
 */
export function AdminInstitutionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const institutionId = user?.institutionId ?? null;

  const value = useMemo<SelectedInstitutionContextValue>(
    () => ({
      selectedInstitutionId: institutionId,
      setSelectedInstitutionId: () => {},
    }),
    [institutionId]
  );

  return (
    <SelectedInstitutionContext.Provider value={value}>
      {children}
    </SelectedInstitutionContext.Provider>
  );
}
