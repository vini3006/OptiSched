import { Link } from "@tanstack/react-router";

import logoFull from "@/assets/logos/logo-full.svg";
import { whatsappLink } from "@/constants/landing";

// TODO: fluxo real de redefinição de senha pendente de um domínio de e-mail
// verificado no Resend (SMTP) para o envio do link. Backend: endpoints
// /auth/forgot-password e /auth/reset-password + tabela password_reset_tokens.
export function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <img src={logoFull} alt="OptiSched" className="h-16 w-auto" />
        </div>

        <div className="card-elevated rounded-2xl px-6 py-8 text-center sm:px-8">
          <h1 className="text-xl font-semibold text-primary">Redefinição de senha</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Essa funcionalidade ainda está em desenvolvimento. Enquanto isso, fale com
            a nossa equipe para redefinir sua senha manualmente.
          </p>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold mt-6 inline-flex w-full items-center justify-center rounded-xl px-6 py-2.5 text-sm font-semibold"
          >
            Falar com o suporte
          </a>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </main>
  );
}
