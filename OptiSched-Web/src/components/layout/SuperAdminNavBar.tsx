import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import logoFull from "@/assets/logos/logo-full.svg";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/UseAuth";

const adminNavLinks = [
  { to: "/admin/instituicoes", label: "Instituições" },
  { to: "/admin/usuarios", label: "Usuários" },
  { to: "/admin/estrutura-academica", label: "Estrutura Acadêmica" },
  { to: "/admin/infraestrutura", label: "Infraestrutura" },
  { to: "/admin/professores", label: "Professores" },
  { to: "/admin/grades", label: "Grades" },
];

export function SuperAdminNavBar() {
  const { user, logout, isLoggingOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    await navigate({ to: "/login" });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link to="/admin" className="flex items-center">
            <img src={logoFull} alt="OptiSched" className="h-20 w-auto" />
          </Link>

          <nav className="hidden items-center gap-4 sm:flex">
            {adminNavLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                activeProps={{ className: "text-primary" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut className="size-4" />
            {isLoggingOut ? "Saindo..." : "Sair"}
          </Button>
        </div>
      </div>

      <nav className="flex items-center gap-4 border-t border-border/70 px-4 py-2 sm:hidden">
        {adminNavLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            activeProps={{ className: "text-primary" }}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
