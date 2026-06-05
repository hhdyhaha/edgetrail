import { Badge, Button, Card } from "@edgetrail/ui";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "#/ui/app-shell";

type Organization = {
  id: string;
  name: string;
};

export const Route = createFileRoute("/app/sites/new")({ component: NewSitePage });

function NewSitePage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/organizations")
      .then((response) => response.json() as Promise<{ organizations?: Organization[] }>)
      .then((data) => setOrganizations(data.organizations ?? []));
  }, []);

  return (
    <AppShell
      active="Sites"
      subtitle="Add an allowed domain and generate a tracking script."
      title="Create site"
    >
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1fr]">
        <Card>
          <h2 className="text-xl font-bold">Site details</h2>
          <form
            className="mt-8 grid gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void fetch("/api/sites", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  organizationId: String(form.get("organizationId")),
                  name: String(form.get("name")),
                  primaryDomain: String(form.get("primaryDomain")),
                  timezone: "UTC",
                }),
              })
                .then(async (response) => {
                  if (!response.ok) {
                    throw new Error(await response.text());
                  }
                  return response.json() as Promise<{ site: { id: string } }>;
                })
                .then((data) =>
                  navigate({ to: "/app/sites/$siteId", params: { siteId: data.site.id } }),
                )
                .catch((caught) => setError(caught.message));
            }}
          >
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Organization
              </span>
              <select
                className="h-12 rounded-md border border-[#dee3ea] bg-white px-4 text-sm outline-none transition focus:border-[#ec7124] dark:border-slate-800 dark:bg-slate-950"
                name="organizationId"
                required
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Site name
              </span>
              <input
                className="h-12 rounded-md border border-[#dee3ea] bg-white px-4 text-sm outline-none transition focus:border-[#ec7124] dark:border-slate-800 dark:bg-slate-950"
                name="name"
                placeholder="Site name"
                required
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Primary domain
              </span>
              <input
                className="h-12 rounded-md border border-[#dee3ea] bg-white px-4 text-sm outline-none transition focus:border-[#ec7124] dark:border-slate-800 dark:bg-slate-950"
                name="primaryDomain"
                placeholder="example.com"
                required
              />
            </label>
            <div className="rounded-lg border border-orange-200 bg-[#fff5ee] p-5 dark:border-orange-900 dark:bg-orange-950/20">
              <div className="text-sm font-bold">Domain validation</div>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                The collector accepts events only from allowed origins for this site.
              </p>
            </div>
            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button type="submit">Create site</Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="text-xl font-bold">Install preview</h2>
          <div className="mt-8 grid gap-8">
            {[
              ["1", "Create site record", "D1 stores site metadata and allowed domain."],
              ["2", "Copy tracking script", "A tiny script is generated for the public site id."],
              ["3", "Verify first event", "Collector returns 204 and WAE starts receiving rows."],
            ].map(([number, title, description]) => (
              <div className="flex gap-5" key={number}>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#ec7124] bg-[#fff5ee] text-xs font-bold text-[#ec7124]">
                  {number}
                </span>
                <span>
                  <span className="block font-bold">{title}</span>
                  <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">
                    {description}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-12 rounded-lg border border-[#dee3ea] bg-[#fbfaf7] p-6 dark:border-slate-800 dark:bg-slate-900/30">
            <div className="text-sm font-semibold">Tracking script</div>
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Generated after the site is created.
            </div>
          </div>
          <div className="mt-4">
            <Badge tone="orange">Generated after create</Badge>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
