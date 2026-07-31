import { createFileRoute, redirect } from "@tanstack/react-router";

import { AUTH_QUERY_KEY, fetchCurrentUser } from "@/api/auth";
import { ProfessorLayout } from "@/components/layout/ProfessorLayout";

export const Route = createFileRoute("/professor")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData({
      queryKey: AUTH_QUERY_KEY,
      queryFn: fetchCurrentUser,
      staleTime: 5 * 60 * 1000,
    });

    if (!user) {
      throw redirect({ to: "/login" });
    }

    if (user.role !== "PROFESSOR") {
      throw redirect({ to: "/" });
    }

    return { user };
  },
  component: ProfessorLayout,
});
