import logoWhite from "@/assets/logos/logo-white.svg";
import { navLinks } from "@/constants/landing";

export function Footer() {
  return (
    <footer className="bg-olive-deep text-primary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <img src={logoWhite} alt="" className="size-8" />
              <p className="font-display text-2xl font-bold">OptiSched</p>
            </div>
            <p className="mt-2 max-w-sm text-sm text-primary-foreground/70">
              Transformando a complexidade das grades acadêmicas em soluções inteligentes.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold">Navegação</p>
            <ul className="mt-3 space-y-2 text-sm text-primary-foreground/70">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="transition-colors hover:text-accent">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-primary-foreground/70">
              <li>
                <a href="#precos" className="transition-colors hover:text-accent"> 
                  Termos de uso 
                </a>
              </li>
              <li>
                <a href="#precos" className="transition-colors hover:text-accent">
                  Política de privacidade
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-12 border-t border-primary-foreground/15 pt-6 text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} OptiSched. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}

/* TODO: Write Terms of Use and Privacy policy */