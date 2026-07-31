import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import logoFull from "@/assets/logos/logo-full.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { forgotPassword } from "@/api/auth";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/lib/validations/forgot-password-schema";

export function ForgotPasswordPage() {
  const { t } = useTranslation("auth");
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ForgotPasswordFormValues) => forgotPassword(values.email),
    onSuccess: () => setSubmitted(true),
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    // Always show the same success state regardless of whether the e-mail
    // matched an account — mirrors the backend's anti-enumeration stance.
    await mutation.mutateAsync(values).catch(() => setSubmitted(true));
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <img src={logoFull} alt="OptiSched" className="h-16 w-auto" />
        </div>

        <div className="card-elevated rounded-2xl px-6 py-8 sm:px-8">
          {submitted ? (
            <div className="text-center">
              <h1 className="text-xl font-semibold text-primary">
                {t("forgotPassword.checkEmailTitle")}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("forgotPassword.checkEmailDescription")}
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-center text-xl font-semibold text-primary">
                {t("forgotPassword.title")}
              </h1>
              <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
                {t("forgotPassword.description")}
              </p>

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6">
                <FieldGroup>
                  <Field data-invalid={!!errors.email}>
                    <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
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

                  <Button
                    type="submit"
                    disabled={mutation.isPending}
                    className="btn-gold w-full justify-center py-2.5 text-sm font-semibold"
                  >
                    {mutation.isPending ? t("forgotPassword.sending") : t("forgotPassword.sendResetLink")}
                  </Button>
                </FieldGroup>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </main>
  );
}
