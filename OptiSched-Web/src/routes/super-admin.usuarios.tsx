import { createFileRoute } from "@tanstack/react-router";

import { UsersPage } from "@/pages/admin/UsersPage";

export const Route = createFileRoute("/super-admin/usuarios")({
  component: UsersPage,
});
