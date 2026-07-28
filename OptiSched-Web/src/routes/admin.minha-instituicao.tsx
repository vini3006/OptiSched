import { createFileRoute } from "@tanstack/react-router";

import { MyInstitutionPage } from "@/pages/admin/MyInstitutionPage";

export const Route = createFileRoute("/admin/minha-instituicao")({
  component: MyInstitutionPage,
});
