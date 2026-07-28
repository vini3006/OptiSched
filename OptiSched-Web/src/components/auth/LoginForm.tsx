import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { isAxiosError } from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useAuth } from "@/hooks/UseAuth";
import { loginSchema, type LoginFormValues } from "@/lib/validations/login-schema";
import { whatsappLink } from "@/constants/landing";

export function LoginForm() {
  const { login, isLoggingIn } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);

    try {
      await login(values);
      await navigate({ to: "/" });
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        setFormError("E-mail ou senha inválidos.");
      } else {
        setFormError("Não foi possível entrar. Tente novamente em instantes.");
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="voce@instituicao.edu.br"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Senha</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>

        <div className="flex justify-end">
          <Link
            to="/esqueci-senha"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary hover:underline"
          >
            Esqueceu sua senha?
          </Link>
        </div>

        {formError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {formError}
          </p>
        )}

        <Button
          type="submit"
          disabled={isLoggingIn}
          className="btn-gold w-full justify-center py-2.5 text-sm font-semibold"
        >
          {isLoggingIn ? "Entrando..." : "Entrar"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Ainda não possui uma conta?{" "}
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Fale conosco
          </a>
        </p>
      </FieldGroup>
    </form>
  );
}
