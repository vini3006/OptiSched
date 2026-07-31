import { createFileRoute } from "@tanstack/react-router";

import { AvailabilityPage } from "@/pages/professor/AvailabilityPage";

export const Route = createFileRoute("/professor/disponibilidade")({
  component: AvailabilityPage,
});
