import { Outlet, useLocation } from "@tanstack/react-router";

import { SuperAdminNavBar } from "@/components/layout/SuperAdminNavBar";
import { InstitutionSelectorBar } from "@/components/layout/InstitutionSelectorBar";
import { InstitutionModeToggle } from "@/components/layout/InstitutionModeToggle";
import { SelectedInstitutionProvider } from "@/contexts/SelectedInstitutionContext";
import { InstitutionModeProvider } from "@/contexts/InstitutionModeContext";

const ROUTES_WITHOUT_INSTITUTION_SELECTOR = ["/super-admin/instituicoes"];

export function SuperAdminLayout() {
  const { pathname } = useLocation();
  const showInstitutionSelector = !ROUTES_WITHOUT_INSTITUTION_SELECTOR.includes(pathname);

  return (
    <InstitutionModeProvider>
      <SelectedInstitutionProvider>
        <div className="min-h-screen">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            Pular para o conteúdo
          </a>
          <SuperAdminNavBar />
          <div className="border-b border-border/70 bg-secondary/40">
            <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
              <InstitutionModeToggle />
            </div>
          </div>
          {showInstitutionSelector && <InstitutionSelectorBar />}
          <main id="main-content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <Outlet />
          </main>
        </div>
      </SelectedInstitutionProvider>
    </InstitutionModeProvider>
  );
}
