import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { navLinks, whatsappLink } from "@/constants/landing";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileMenu({
  open,
  onClose,
}: MobileMenuProps) {
  if (!open) return null;

  return (
    <div className="border-t border-border bg-background px-4 py-4 lg:hidden">
      <nav className="flex flex-col gap-3">

        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={onClose}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            {link.label}
          </a>
        ))}

        <div className="mt-3 flex flex-col gap-3">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              render={<Link to="/login" />}
            >
              Login
            </Button>

            <Button
              className="btn-gold flex-1"
              onClick={onClose}
              render={<a href={whatsappLink} target="_blank" rel="noopener noreferrer" />}
            >
              Solicitar Demonstração
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={onClose}
            render={<Link to="/demo" />}
          >
            Testar Grátis
          </Button>
        </div>
      </nav>
    </div>
  );
}