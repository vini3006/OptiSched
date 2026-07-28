import { Link } from "@tanstack/react-router";

import logoFull from "@/assets/logos/logo-full.svg";
import { LoginForm } from "@/components/auth/LoginForm";

export function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <img src={logoFull} alt="OptiSched" className="h-48 w-auto" />
        </div>

        <div className="card-elevated rounded-2xl px-6 py-8 sm:px-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-primary">Bem-vindo de volta</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Entre com suas credenciais para acessar sua conta.
            </p>
          </div>

          <LoginForm />
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="font-medium text-primary hover:underline">
            Voltar para o site
          </Link>
        </p>
      </div>
    </main>
  );
}
