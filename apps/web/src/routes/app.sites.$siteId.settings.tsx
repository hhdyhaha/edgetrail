import { Badge, Button, Card } from "@edgetrail/ui";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Link2, Unlink } from "lucide-react";
import { useEffect, useState } from "react";
import { m } from "#/paraglide/messages";
import { getLocale, localizeHref } from "#/paraglide/runtime";
import { AppShell } from "#/ui/app-shell";

type SiteDetails = {
  site?: { id: string; name: string; primary_domain: string; public_site_id: string };
  domains?: { id: string; domain: string; verified_at: string }[];
  shareLinks?: { id: string; token: string; enabled: number }[];
  trackingScript?: string;
};

export const Route = createFileRoute("/app/sites/$siteId/settings")({ component: SiteSettings });

function SiteSettings() {
  const { siteId } = Route.useParams();
  const [details, setDetails] = useState<SiteDetails>({});
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const load = () => {
    void fetch(`/api/sites/${siteId}`)
      .then((response) => response.json() as Promise<SiteDetails>)
      .then((nextDetails) => {
        setDetails(nextDetails);
        const activeShare = nextDetails.shareLinks?.find((link) => link.enabled === 1);
        setShareUrl(activeShare ? localizedShareUrl(activeShare.token) : "");
      });
  };

  useEffect(load, [siteId]);

  return (
    <AppShell
      active="Settings"
      siteId={siteId}
      subtitle={m.site_settings_subtitle()}
      title={m.site_settings_title()}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">{m.site_settings_tracking_script()}</h2>
            <button
              aria-label={m.site_settings_copy_tracking_script()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dee3ea] text-slate-600 hover:bg-[#fff5ee] hover:text-[#ec7124] dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
              onClick={() => {
                if (!details.trackingScript) {
                  return;
                }
                void navigator.clipboard.writeText(details.trackingScript).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                });
              }}
              type="button"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <pre className="mt-6 min-h-28 overflow-auto rounded-lg bg-[#1f2937] p-6 text-sm leading-7 text-slate-200">
            {details.trackingScript}
          </pre>
          <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
            {m.site_settings_script_description()}
          </p>
        </Card>
        <Card>
          <h2 className="text-xl font-bold">{m.site_settings_allowed_domains()}</h2>
          <div className="mt-6 grid gap-3">
            {(details.domains ?? []).map((domain) => (
              <div
                className="flex items-center justify-between rounded-md border border-[#dee3ea] bg-[#fbfaf7] px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/30"
                key={domain.id}
              >
                <span>{domain.domain}</span>
                <Badge>{m.site_settings_verified()}</Badge>
              </div>
            ))}
          </div>
          <form
            className="mt-6 flex gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void fetch(`/api/sites/${siteId}/domains`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ domain: String(form.get("domain")) }),
              }).then(load);
            }}
          >
            <input
              className="min-w-0 flex-1 rounded-md border border-[#dee3ea] bg-white px-4 py-3 text-sm outline-none focus:border-[#ec7124] dark:border-slate-800 dark:bg-slate-950"
              name="domain"
              placeholder="docs.example.com"
            />
            <Button type="submit">{m.site_settings_add()}</Button>
          </form>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">{m.site_settings_public_share()}</h2>
            {shareUrl ? (
              <Badge>{m.site_settings_enabled()}</Badge>
            ) : (
              <Badge tone="slate">{m.site_settings_disabled()}</Badge>
            )}
          </div>
          {shareUrl ? (
            <p className="mt-6 break-all rounded-md border border-[#dee3ea] bg-[#fbfaf7] px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-300">
              {shareUrl}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              onClick={() => {
                void fetch(`/api/sites/${siteId}/share-links`, { method: "POST" })
                  .then((response) => response.json())
                  .then((data) => {
                    const result = data as { shareLink?: { token?: string } };
                    if (result.shareLink?.token) {
                      setShareUrl(localizedShareUrl(result.shareLink.token));
                      load();
                    }
                  });
              }}
              type="button"
            >
              <Link2 className="h-4 w-4" />
              {m.site_settings_generate_public_link()}
            </Button>
            <Button
              disabled={!details.shareLinks?.some((link) => link.enabled === 1)}
              onClick={() => {
                const activeShare = details.shareLinks?.find((link) => link.enabled === 1);
                if (!activeShare) {
                  return;
                }
                void fetch(`/api/sites/${siteId}/share-links/${activeShare.id}`, {
                  method: "DELETE",
                }).then(() => {
                  setShareUrl("");
                  load();
                });
              }}
              type="button"
              variant="secondary"
            >
              <Unlink className="h-4 w-4" />
              {m.site_settings_disable_public_link()}
            </Button>
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-bold">{m.site_settings_privacy_policy()}</h2>
          <div className="mt-7 grid gap-5 text-sm">
            {[
              m.login_no_raw_ip_storage(),
              m.site_settings_no_full_raw_user_agent(),
              m.site_settings_no_cross_site_visitor_id(),
              m.site_settings_d1_daily_rollups(),
            ].map((item) => (
              <div className="flex items-center gap-4" key={item}>
                <span className="h-4 w-4 rounded-full bg-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="text-lg font-bold">{m.site_settings_site_identity()}</h2>
        <div className="mt-6 grid gap-5 text-sm md:grid-cols-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {m.site_settings_site_id()}
            </div>
            <div className="mt-3">{details.site?.id ?? siteId}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {m.site_settings_public_site_id()}
            </div>
            <div className="mt-3">{details.site?.public_site_id ?? m.site_settings_pending()}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {m.site_settings_domain()}
            </div>
            <div className="mt-3">{details.site?.primary_domain ?? m.site_settings_pending()}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {m.site_settings_share()}
            </div>
            <div className="mt-3">
              {shareUrl ? m.site_settings_enabled() : m.site_settings_disabled()}
            </div>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}

function localizedShareUrl(token: string): string {
  return `${location.origin}${localizeHref(`/share/${token}`, { locale: getLocale() })}`;
}
