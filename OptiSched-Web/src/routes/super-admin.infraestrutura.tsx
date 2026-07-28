import { createFileRoute } from "@tanstack/react-router";

import { InfrastructurePage } from "@/pages/admin/InfrastructurePage";

export const Route = createFileRoute("/super-admin/infraestrutura")({
  component: InfrastructurePage,
});
