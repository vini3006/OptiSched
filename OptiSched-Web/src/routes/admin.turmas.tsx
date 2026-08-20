import { createFileRoute } from "@tanstack/react-router";

import { TurmasPage } from "@/pages/admin/TurmasPage";

export const Route = createFileRoute("/admin/turmas")({
  component: TurmasPage,
});
