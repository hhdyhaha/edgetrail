const sensitiveKeys = [
  "ip",
  "ipAddress",
  "userAgent",
  "ua",
  "title",
  "email",
  "name",
  "phone",
  "token",
  "secret",
  "authorization",
  "cookie",
];

export function redactObject<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => redactObject(item)) as T;
  }
  if (!input || typeof input !== "object") {
    return input;
  }
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive.toLowerCase()))) {
      output[key] = "[REDACTED]";
      continue;
    }
    output[key] = redactObject(value);
  }
  return output as T;
}

export function assertNoSensitiveKeys(value: unknown): void {
  const serialized = JSON.stringify(value).toLowerCase();
  for (const key of sensitiveKeys) {
    if (serialized.includes(key.toLowerCase())) {
      throw new Error(`Sensitive field leaked: ${key}`);
    }
  }
}
