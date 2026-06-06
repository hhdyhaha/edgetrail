import { m } from "#/paraglide/messages";
import { getLocale, type Locale } from "#/paraglide/runtime";

export function intlLocale(locale: Locale = getLocale()): "en" | "zh-CN" {
  return locale === "zh" ? "zh-CN" : "en";
}

export function siteStatusLabel(status: string): string {
  if (status === "active") {
    return m.site_status_active();
  }
  if (status === "deleted") {
    return m.site_status_deleted();
  }
  return m.site_status_pending();
}
