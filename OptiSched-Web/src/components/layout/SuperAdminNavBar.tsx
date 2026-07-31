import { useTranslation } from "react-i18next";

import { AppNavBar, type NavLink } from "@/components/layout/AppNavBar";

export function SuperAdminNavBar() {
  const { t } = useTranslation("appNavBar");

  const navLinks: NavLink[] = [
    { to: "/super-admin/instituicoes", label: t("superAdmin.instituicoes") },
    { to: "/super-admin/usuarios", label: t("superAdmin.usuarios") },
    { to: "/super-admin/estrutura-academica", label: t("superAdmin.estruturaAcademica") },
    { to: "/super-admin/infraestrutura", label: t("superAdmin.infraestrutura") },
    { to: "/super-admin/professores", label: t("superAdmin.professores") },
    { to: "/super-admin/grades", label: t("superAdmin.grades") },
  ];

  return <AppNavBar logoHref="/super-admin" navLinks={navLinks} />;
}
