import { useTranslation } from "react-i18next";

import { AppNavBar, type NavLink } from "@/components/layout/AppNavBar";

export function ProfessorNavBar() {
  const { t } = useTranslation("appNavBar");

  const navLinks: NavLink[] = [
    { to: "/professor/horario", label: t("professor.meuHorario") },
    { to: "/professor/disponibilidade", label: t("professor.minhaDisponibilidade") },
    { to: "/professor/qualificacoes", label: t("professor.minhasQualificacoes") },
  ];

  return <AppNavBar logoHref="/professor" navLinks={navLinks} />;
}
