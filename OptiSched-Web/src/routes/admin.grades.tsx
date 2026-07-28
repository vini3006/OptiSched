import { createFileRoute } from "@tanstack/react-router";

import { GradesPage } from "@/pages/admin/GradesPage";

export const Route = createFileRoute("/admin/grades")({
  component: GradesPage,
});
