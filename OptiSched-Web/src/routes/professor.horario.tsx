import { createFileRoute } from "@tanstack/react-router";

import { SchedulePage } from "@/pages/professor/SchedulePage";

export const Route = createFileRoute("/professor/horario")({
  component: SchedulePage,
});
