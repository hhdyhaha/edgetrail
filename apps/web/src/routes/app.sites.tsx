import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/sites")({ component: SitesLayout });

function SitesLayout() {
  return <Outlet />;
}
