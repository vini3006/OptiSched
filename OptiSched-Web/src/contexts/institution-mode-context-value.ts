import { createContext } from "react";

import type { InstitutionType } from "@/types/Institution";

export type InstitutionModeContextValue = {
  institutionMode: InstitutionType;
  setInstitutionMode: (mode: InstitutionType) => void;
};

export const InstitutionModeContext = createContext<InstitutionModeContextValue | undefined>(
  undefined
);
