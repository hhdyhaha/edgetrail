import { useLocation } from "@tanstack/react-router";
import { Languages } from "lucide-react";
import { m } from "#/paraglide/messages";
import { deLocalizeHref, getLocale, type Locale, localizeHref } from "#/paraglide/runtime";

const localeOptions = [
  { locale: "en", label: m.language_english },
  { locale: "zh", label: m.language_chinese },
] as const satisfies readonly { locale: Locale; label: () => string }[];

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const href = useLocation({ select: (location) => location.href });
  const currentLocale = getLocale();
  const baseHref = deLocalizeHref(href);

  return (
    <nav
      aria-label={m.language_switcher_label()}
      className={`inline-flex h-9 items-center gap-1 rounded-full bg-slate-100 p-1 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300 ${className}`}
    >
      <Languages className="ml-2 h-3.5 w-3.5 text-slate-500" />
      {localeOptions.map(({ label, locale }) => {
        const active = currentLocale === locale;
        return (
          <a
            aria-current={active ? "true" : undefined}
            className={`rounded-full px-2 py-1 transition-colors ${
              active
                ? "bg-white text-[#181c23] shadow-sm dark:bg-slate-800 dark:text-slate-50"
                : "hover:bg-[#fff5ee] hover:text-[#ec7124] dark:hover:bg-slate-800"
            }`}
            href={localizeHref(baseHref, { locale })}
            hrefLang={locale}
            key={locale}
          >
            {label()}
          </a>
        );
      })}
    </nav>
  );
}
