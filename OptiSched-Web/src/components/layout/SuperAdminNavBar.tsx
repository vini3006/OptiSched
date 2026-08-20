import { useTranslation } from "react-i18next";

import { AppNavBar, type NavLink } from "@/components/layout/AppNavBar";
import { useInstitutionMode } from "@/hooks/UseInstitutionMode";

export function SuperAdminNavBar() {
  const { t } = useTranslation("appNavBar");
  const { institutionMode } = useInstitutionMode();

  const academicStructureLink: NavLink =
    institutionMode === "SCHOOL"
      ? { to: "/super-admin/turmas", label: t("superAdmin.turmas") }
      : { to: "/super-admin/estrutura-academica", label: t("superAdmin.estruturaAcademica") };

  const navLinks: NavLink[] = [
    { to: "/super-admin/instituicoes", label: t("superAdmin.instituicoes") },
    { to: "/super-admin/usuarios", label: t("superAdmin.usuarios") },
    academicStructureLink,
    { to: "/super-admin/infraestrutura", label: t("superAdmin.infraestrutura") },
    { to: "/super-admin/professores", label: t("superAdmin.professores") },
    { to: "/super-admin/grades", label: t("superAdmin.grades") },
  ];

  return <AppNavBar logoHref="/super-admin" navLinks={navLinks} />;
}
