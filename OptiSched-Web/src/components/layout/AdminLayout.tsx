import { Outlet } from "@tanstack/react-router";

import { SuperAdminNavBar } from "@/components/layout/SuperAdminNavBar";

export function AdminLayout() {
  return (
    <div className="min-h-screen">
      <SuperAdminNavBar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
