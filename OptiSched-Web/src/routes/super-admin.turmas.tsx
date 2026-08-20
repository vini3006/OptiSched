import { createFileRoute } from "@tanstack/react-router";

import { TurmasPage } from "@/pages/admin/TurmasPage";

export const Route = createFileRoute("/super-admin/turmas")({
  component: TurmasPage,
});
