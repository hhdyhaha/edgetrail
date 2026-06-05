export type WaeSqlClientConfig = {
  accountId: string;
  apiToken: string;
};

export type WaeSqlResult = {
  data: unknown[];
  meta?: unknown;
};

export class MissingWaeConfigError extends Error {
  constructor() {
    super("Missing Cloudflare Workers Analytics Engine SQL API configuration");
    this.name = "MissingWaeConfigError";
  }
}

export async function queryWorkersAnalyticsEngine(
  config: Partial<WaeSqlClientConfig>,
  sql: string,
): Promise<WaeSqlResult> {
  if (!config.accountId || !config.apiToken) {
    throw new MissingWaeConfigError();
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/analytics_engine/sql`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        "Content-Type": "text/plain",
      },
      body: sql,
    },
  );

  if (!response.ok) {
    throw new Error(`Workers Analytics Engine SQL failed with ${response.status}`);
  }

  return (await response.json()) as WaeSqlResult;
}
