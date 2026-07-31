import { createFileRoute } from "@tanstack/react-router";

import { ResetPasswordPage } from "@/pages/ResetPasswordPage";

type ResetPasswordSearch = {
  token?: string;
};

export const Route = createFileRoute("/redefinir-senha")({
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: ResetPasswordPage,
});
