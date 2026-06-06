import { describe, expect, it } from "vitest";
import collectorWrangler from "../../../../apps/collector-worker/wrangler.jsonc?raw";
import queueWrangler from "../../../../apps/queue-worker/wrangler.jsonc?raw";
import webWrangler from "../../wrangler.jsonc?raw";

describe("EdgeTrail naming", () => {
  it("uses EdgeTrail Cloudflare resource names in worker configs", () => {
    const configs = [webWrangler, collectorWrangler, queueWrangler].join("\n");
    const oldResourcePrefix = ["edge", "analytics"].join("-");

    expect(configs).toContain("your-edgetrail-web");
    expect(configs).toContain("your-edgetrail-collector");
    expect(configs).toContain("your-edgetrail-queue");
    expect(configs).toContain("your-edgetrail-events");
    expect(configs).toContain("your-edgetrail-archive-production");
    expect(configs).not.toContain(oldResourcePrefix);
  });
});
