import { Outlet } from "@tanstack/react-router";

import { AdminNavBar } from "@/components/layout/AdminNavBar";
import { AdminInstitutionProvider } from "@/contexts/AdminInstitutionContext";

export function AdminLayout() {
  return (
    <AdminInstitutionProvider>
      <div className="min-h-screen">
        <AdminNavBar />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      </div>
    </AdminInstitutionProvider>
  );
}
