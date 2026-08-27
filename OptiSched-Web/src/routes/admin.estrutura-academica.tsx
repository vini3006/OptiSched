import { createFileRoute, redirect } from "@tanstack/react-router";

import { AcademicStructurePage } from "@/pages/admin/AcademicStructurePage";

export const Route = createFileRoute("/admin/estrutura-academica")({
  // Cursos/Semestres/Ofertas only exist for UNIVERSITY institutions (backend
  // rejects them for SCHOOL) — a SCHOOL admin navigating here directly (the
  // navbar already hides this link for them) gets bounced to Turmas instead
  // of landing on a page that errors out.
  beforeLoad: ({ context }) => {
    if (context.user.institutionType === "SCHOOL") {
      throw redirect({ to: "/admin/turmas" });
    }
  },
  component: AcademicStructurePage,
});
