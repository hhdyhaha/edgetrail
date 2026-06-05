import { Button, Card } from "@edgetrail/ui";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Chrome, Lock } from "lucide-react";
import { authClient } from "#/lib/auth-client";
import { getSession } from "#/lib/auth-functions";
import { ThemeToggle } from "#/ui/theme-toggle";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const session = await getSession();
    if (session) {
      throw redirect({ to: "/app" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] p-5 text-[#181c23] dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-5xl items-center justify-center">
        <Card className="grid w-full overflow-hidden p-0 md:grid-cols-[1fr_300px]">
          <section className="p-8 sm:p-12">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-7 w-7 rounded-md bg-[#ec7124]" />
              <div>
                <div className="text-xl font-bold leading-5">EdgeTrail</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Cloudflare-native</div>
              </div>
            </div>

            <h1 className="mt-16 text-4xl font-bold">Sign in</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
              Google OAuth is the only login method for this MVP. Analytics credentials stay on the
              server side.
            </p>

            <Button
              className="mt-8 w-full sm:w-80"
              onClick={() => {
                void authClient.signIn.social({ provider: "google", callbackURL: "/app" });
              }}
            >
              <Chrome className="h-4 w-4" />
              Continue with Google
            </Button>
          </section>

          <aside className="border-t border-[#dee3ea] bg-[#fbfaf7] p-8 dark:border-slate-800 dark:bg-slate-900/40 md:border-l md:border-t-0">
            <div className="flex justify-end">
              <ThemeToggle />
            </div>
            <div className="mt-24 space-y-4">
              <div className="rounded-lg border border-[#dee3ea] bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-3 text-sm font-semibold">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <Lock className="h-4 w-4" />
                  </span>
                  Server-side analytics access
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Cloudflare API tokens are never exposed to the browser.
                </p>
              </div>
              {["No password accounts", "No raw IP storage", "No cookie tracking"].map((label) => (
                <div
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
                  key={label}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  {label}
                </div>
              ))}
            </div>
          </aside>
        </Card>
      </div>
    </main>
  );
}
