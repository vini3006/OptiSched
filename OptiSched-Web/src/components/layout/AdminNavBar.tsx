import { useTranslation } from "react-i18next";

import { AppNavBar, type NavLink } from "@/components/layout/AppNavBar";

export function AdminNavBar() {
  const { t } = useTranslation("appNavBar");

  const navLinks: NavLink[] = [
    { to: "/admin/minha-instituicao", label: t("admin.minhaInstituicao") },
    { to: "/admin/usuarios", label: t("admin.usuarios") },
    { to: "/admin/estrutura-academica", label: t("admin.estruturaAcademica") },
    { to: "/admin/infraestrutura", label: t("admin.infraestrutura") },
    { to: "/admin/professores", label: t("admin.professores") },
    { to: "/admin/grades", label: t("admin.grades") },
  ];

  return <AppNavBar logoHref="/admin" navLinks={navLinks} />;
}
