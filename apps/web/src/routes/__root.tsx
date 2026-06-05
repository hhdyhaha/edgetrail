import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import type * as React from "react";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        name: "description",
        content: "Cloudflare-native, privacy-first web analytics for indie tools and SaaS sites.",
      },
      { title: "EdgeTrail" },
      { property: "og:title", content: "EdgeTrail" },
      {
        property: "og:description",
        content: "Self-hostable Cloudflare-native analytics with no cookies and no raw IP storage.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: "/" },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Small inline script applies persisted theme before CSS paints.
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('edgetrail-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
