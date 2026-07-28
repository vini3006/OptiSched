import { createContext } from "react";

export type SelectedInstitutionContextValue = {
  selectedInstitutionId: number | null;
  setSelectedInstitutionId: (institutionId: number | null) => void;
};

export const SelectedInstitutionContext = createContext<
  SelectedInstitutionContextValue | undefined
>(undefined);
