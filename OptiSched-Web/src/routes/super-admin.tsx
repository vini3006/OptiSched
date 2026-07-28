import { createFileRoute, redirect } from "@tanstack/react-router";

import { AUTH_QUERY_KEY, fetchCurrentUser } from "@/api/auth";
import { AdminLayout } from "@/components/layout/AdminLayout";

export const Route = createFileRoute("/super-admin")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData({
      queryKey: AUTH_QUERY_KEY,
      queryFn: fetchCurrentUser,
      staleTime: 5 * 60 * 1000,
    });

    if (!user) {
      throw redirect({ to: "/login" });
    }

    if (user.role !== "SUPER_ADMIN") {
      throw redirect({ to: "/" });
    }

    return { user };
  },
  component: AdminLayout,
});
