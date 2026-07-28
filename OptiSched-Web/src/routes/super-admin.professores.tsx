import { createFileRoute } from "@tanstack/react-router";

import { ProfessorsPage } from "@/pages/admin/ProfessorsPage";

export const Route = createFileRoute("/super-admin/professores")({
  component: ProfessorsPage,
});
