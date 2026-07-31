import { Outlet } from "@tanstack/react-router";

import { AdminNavBar } from "@/components/layout/AdminNavBar";
import { AdminInstitutionProvider } from "@/contexts/AdminInstitutionContext";

export function AdminLayout() {
  return (
    <AdminInstitutionProvider>
      <div className="min-h-screen">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Pular para o conteúdo
        </a>
        <AdminNavBar />
        <main id="main-content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      </div>
    </AdminInstitutionProvider>
  );
}
