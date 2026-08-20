import { useTranslation } from "react-i18next";

import { AppNavBar, type NavLink } from "@/components/layout/AppNavBar";
import { useAuth } from "@/hooks/UseAuth";

export function AdminNavBar() {
  const { t } = useTranslation("appNavBar");
  const { user } = useAuth();

  const academicStructureLink: NavLink =
    user?.institutionType === "SCHOOL"
      ? { to: "/admin/turmas", label: t("admin.turmas") }
      : { to: "/admin/estrutura-academica", label: t("admin.estruturaAcademica") };

  const navLinks: NavLink[] = [
    { to: "/admin/minha-instituicao", label: t("admin.minhaInstituicao") },
    { to: "/admin/usuarios", label: t("admin.usuarios") },
    academicStructureLink,
    { to: "/admin/infraestrutura", label: t("admin.infraestrutura") },
    { to: "/admin/professores", label: t("admin.professores") },
    { to: "/admin/grades", label: t("admin.grades") },
  ];

  return <AppNavBar logoHref="/admin" navLinks={navLinks} />;
}
