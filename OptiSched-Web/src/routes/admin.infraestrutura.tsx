import { createFileRoute } from "@tanstack/react-router";

import { InfrastructurePage } from "@/pages/admin/InfrastructurePage";

export const Route = createFileRoute("/admin/infraestrutura")({
  component: InfrastructurePage,
});
