import { describe, expect, it } from "vitest";
import { resolveStoredTheme, toggleTheme } from "./theme";

describe("theme helpers", () => {
  it("accepts only supported stored theme values", () => {
    expect(resolveStoredTheme("dark")).toBe("dark");
    expect(resolveStoredTheme("light")).toBe("light");
    expect(resolveStoredTheme("system")).toBe("system");
    expect(resolveStoredTheme("sepia")).toBe("system");
    expect(resolveStoredTheme(null)).toBe("system");
  });

  it("toggles between explicit light and dark mode", () => {
    expect(toggleTheme("light")).toBe("dark");
    expect(toggleTheme("dark")).toBe("light");
    expect(toggleTheme("system")).toBe("dark");
  });
});
