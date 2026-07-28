import { AppNavBar, type NavLink } from "@/components/layout/AppNavBar";

const navLinks: NavLink[] = [
  { to: "/admin/minha-instituicao", label: "Minha Instituição" },
  { to: "/admin/estrutura-academica", label: "Estrutura Acadêmica" },
  { to: "/admin/infraestrutura", label: "Infraestrutura" },
];

export function AdminNavBar() {
  return <AppNavBar logoHref="/admin" navLinks={navLinks} />;
}
