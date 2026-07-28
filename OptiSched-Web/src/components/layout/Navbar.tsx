import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "@tanstack/react-router";

import logoFull from "@/assets/logos/logo-full.svg";
import { Button } from "@/components/ui/button";
import { MobileMenu } from "@/components/landing/MobileMenu";
import { navLinks } from "@/constants/landing";
import { whatsappLink } from "@/constants/landing";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">

        {/* Logo */}
        <a href="#inicio" className="flex items-center">
          <img
            src={logoFull}
            alt="OptiSched"
            className="h-20 w-auto"
          />
        </a>

        {/* Navegação Desktop */}
        <nav className="hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Botões Desktop */}
        <div className="hidden items-center gap-3 lg:flex">
          <Button variant="outline" render={<Link to="/login" />}>
            Login
          </Button>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold"
          >
            Solicitar Demonstração
          </a>
        </div>

        {/* Botão Mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      <MobileMenu
        open={open}
        onClose={() => setOpen(false)}
      />
    </header>
  );
}
