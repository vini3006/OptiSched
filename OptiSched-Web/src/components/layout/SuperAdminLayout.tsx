import { Outlet, useLocation } from "@tanstack/react-router";

import { SuperAdminNavBar } from "@/components/layout/SuperAdminNavBar";
import { InstitutionSelectorBar } from "@/components/layout/InstitutionSelectorBar";
import { SelectedInstitutionProvider } from "@/contexts/SelectedInstitutionContext";

const ROUTES_WITHOUT_INSTITUTION_SELECTOR = ["/super-admin/instituicoes"];

export function SuperAdminLayout() {
  const { pathname } = useLocation();
  const showInstitutionSelector = !ROUTES_WITHOUT_INSTITUTION_SELECTOR.includes(pathname);

  return (
    <SelectedInstitutionProvider>
      <div className="min-h-screen">
        <SuperAdminNavBar />
        {showInstitutionSelector && <InstitutionSelectorBar />}
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      </div>
    </SelectedInstitutionProvider>
  );
}
