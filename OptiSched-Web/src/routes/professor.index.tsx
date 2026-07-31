import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/professor/")({
  beforeLoad: () => {
    throw redirect({ to: "/professor/horario" });
  },
});
