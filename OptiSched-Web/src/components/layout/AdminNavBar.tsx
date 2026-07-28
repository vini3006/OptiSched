import { AppNavBar, type NavLink } from "@/components/layout/AppNavBar";

const navLinks: NavLink[] = [
  { to: "/admin/minha-instituicao", label: "Minha Instituição" },
  { to: "/admin/usuarios", label: "Usuários" },
  { to: "/admin/estrutura-academica", label: "Estrutura Acadêmica" },
  { to: "/admin/infraestrutura", label: "Infraestrutura" },
  { to: "/admin/professores", label: "Professores" },
];

export function AdminNavBar() {
  return <AppNavBar logoHref="/admin" navLinks={navLinks} />;
}
