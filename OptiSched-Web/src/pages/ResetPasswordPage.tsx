import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { Eye, EyeOff } from "lucide-react";

import logoFull from "@/assets/logos/logo-full.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { resetPassword } from "@/api/auth";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/lib/validations/reset-password-schema";

const routeApi = getRouteApi("/redefinir-senha");

export function ResetPasswordPage() {
  const { t } = useTranslation("auth");
  const { token } = routeApi.useSearch();
  const navigate = useNavigate();

  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ResetPasswordFormValues) => resetPassword(token as string, values.newPassword),
    onSuccess: () => setSuccess(true),
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    setFormError(null);
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        setFormError(error.response.data.message);
      } else {
        setFormError(t("resetPassword.genericError"));
      }
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <img src={logoFull} alt="OptiSched" className="h-16 w-auto" />
        </div>

        <div className="card-elevated rounded-2xl px-6 py-8 sm:px-8">
          {!token ? (
            <div className="text-center">
              <h1 className="text-xl font-semibold text-primary">
                {t("resetPassword.invalidLinkTitle")}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("resetPassword.invalidLinkDescription")}
              </p>
            </div>
          ) : success ? (
            <div className="text-center">
              <h1 className="text-xl font-semibold text-primary">{t("resetPassword.successTitle")}</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("resetPassword.successDescription")}
              </p>
              <Button
                className="btn-gold mt-6 w-full justify-center py-2.5 text-sm font-semibold"
                onClick={() => navigate({ to: "/login" })}
              >
                {t("resetPassword.goToLogin")}
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-center text-xl font-semibold text-primary">
                {t("resetPassword.newPasswordTitle")}
              </h1>

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6">
                <FieldGroup>
                  <Field data-invalid={!!errors.newPassword}>
                    <FieldLabel htmlFor="newPassword">{t("newPassword")}</FieldLabel>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className="pr-9"
                        aria-invalid={!!errors.newPassword}
                        {...register("newPassword")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    <FieldError errors={[errors.newPassword]} />
                  </Field>

                  <Field data-invalid={!!errors.confirmPassword}>
                    <FieldLabel htmlFor="confirmPassword">{t("confirmPassword")}</FieldLabel>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      aria-invalid={!!errors.confirmPassword}
                      {...register("confirmPassword")}
                    />
                    <FieldError errors={[errors.confirmPassword]} />
                  </Field>

                  {formError && (
                    <p role="alert" className="text-sm font-medium text-destructive">
                      {formError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={mutation.isPending}
                    className="btn-gold w-full justify-center py-2.5 text-sm font-semibold"
                  >
                    {mutation.isPending ? t("common:actions.saving") : t("resetPassword.submitButton")}
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
