import { createFileRoute, redirect } from "@tanstack/react-router";

import { TurmasPage } from "@/pages/admin/TurmasPage";

export const Route = createFileRoute("/admin/turmas")({
  // Séries/Turmas only exist for SCHOOL institutions (backend rejects them
  // for UNIVERSITY) — a UNIVERSITY admin navigating here directly (the
  // navbar already hides this link for them) gets bounced to Estrutura
  // Acadêmica instead of landing on a page that errors out.
  beforeLoad: ({ context }) => {
    if (context.user.institutionType === "UNIVERSITY") {
      throw redirect({ to: "/admin/estrutura-academica" });
    }
  },
  component: TurmasPage,
});
