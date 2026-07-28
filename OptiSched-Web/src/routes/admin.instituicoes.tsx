import { createFileRoute } from "@tanstack/react-router";

import { InstitutionsPage } from "@/pages/admin/InstitutionsPage";

export const Route = createFileRoute("/admin/instituicoes")({
  component: InstitutionsPage,
});
