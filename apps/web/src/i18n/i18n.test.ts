import { describe, expect, it } from "vitest";
import { deLocalizeHref, extractLocaleFromUrl, localizeHref } from "#/paraglide/runtime";
import enMessages from "../../messages/en.json";
import zhMessages from "../../messages/zh.json";

describe("web i18n configuration", () => {
  it("keeps English and Chinese message keys in sync", () => {
    expect(messageKeys(zhMessages)).toEqual(messageKeys(enMessages));
  });

  it("localizes public URLs with English root and Chinese /zh prefix", () => {
    expect(localizeHref("/login", { locale: "en" })).toBe("/login");
    expect(localizeHref("/login", { locale: "zh" })).toBe("/zh/login");
    expect(localizeHref("/app/sites", { locale: "zh" })).toBe("/zh/app/sites");
    expect(localizeHref("/zh/login", { locale: "zh" })).toBe("/zh/login");
    expect(deLocalizeHref("/zh/app/sites")).toBe("/app/sites");
    expect(extractLocaleFromUrl("https://edge.example/zh/login")).toBe("zh");
  });
});

function messageKeys(messages: Record<string, unknown>): string[] {
  return Object.keys(messages)
    .filter((key) => key !== "$schema")
    .sort();
}
