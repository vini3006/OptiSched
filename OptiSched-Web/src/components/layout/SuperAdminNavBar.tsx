import { AppNavBar, type NavLink } from "@/components/layout/AppNavBar";

const navLinks: NavLink[] = [
  { to: "/super-admin/instituicoes", label: "Instituições" },
  { to: "/super-admin/usuarios", label: "Usuários" },
  { to: "/super-admin/estrutura-academica", label: "Estrutura Acadêmica" },
  { to: "/super-admin/infraestrutura", label: "Infraestrutura" },
  { to: "/super-admin/professores", label: "Professores" },
  { to: "/super-admin/grades", label: "Grades" },
];

export function SuperAdminNavBar() {
  return <AppNavBar logoHref="/super-admin" navLinks={navLinks} />;
}
