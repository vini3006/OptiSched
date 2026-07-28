import { createFileRoute } from "@tanstack/react-router";

import { InstitutionsPage } from "@/pages/admin/InstitutionsPage";

export const Route = createFileRoute("/super-admin/instituicoes")({
  component: InstitutionsPage,
});
