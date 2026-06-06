import { afterEach, describe, expect, it, vi } from "vitest";
import { queryWorkersAnalyticsEngine, WaeSqlQueryError } from "./client";

describe("Workers Analytics Engine SQL client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not retain Cloudflare SQL error bodies on failed queries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Unknown table private_dataset_name", { status: 422 })),
    );

    let thrown: unknown;
    try {
      await queryWorkersAnalyticsEngine(
        { accountId: "test-account-id", apiToken: "test-api-token" },
        "SELECT * FROM private_dataset_name",
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(WaeSqlQueryError);
    expect(thrown).toMatchObject({ status: 422 });
    expect(String(thrown)).not.toContain("private_dataset_name");
    expect(JSON.stringify(thrown)).not.toContain("private_dataset_name");
  });
});
