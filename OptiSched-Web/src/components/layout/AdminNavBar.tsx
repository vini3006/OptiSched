import { AppNavBar, type NavLink } from "@/components/layout/AppNavBar";

const navLinks: NavLink[] = [{ to: "/admin/minha-instituicao", label: "Minha Instituição" }];

export function AdminNavBar() {
  return <AppNavBar logoHref="/admin" navLinks={navLinks} />;
}
