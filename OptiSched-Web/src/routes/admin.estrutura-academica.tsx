import { createFileRoute } from "@tanstack/react-router";

import { AcademicStructurePage } from "@/pages/admin/AcademicStructurePage";

export const Route = createFileRoute("/admin/estrutura-academica")({
  component: AcademicStructurePage,
});
