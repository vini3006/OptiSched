import { createFileRoute } from "@tanstack/react-router";

import { QualificationsPage } from "@/pages/professor/QualificationsPage";

export const Route = createFileRoute("/professor/qualificacoes")({
  component: QualificationsPage,
});
