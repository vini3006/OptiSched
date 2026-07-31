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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Pular para o conteúdo
        </a>
        <SuperAdminNavBar />
        {showInstitutionSelector && <InstitutionSelectorBar />}
        <main id="main-content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      </div>
    </SelectedInstitutionProvider>
  );
}
