import {
  incrementRollups,
  insertProcessedQueueEvent,
  recordArchiveObject,
} from "@edgetrail/db";
import {
  type QueueEventMessage,
  queueEventMessageSchema,
  redactObject,
  toIsoDate,
} from "@edgetrail/shared";

type QueueBindings = {
  DB: D1Database;
  ARCHIVE_BUCKET: R2Bucket;
};

type WorkerExport = {
  queue(
    batch: MessageBatch<QueueEventMessage>,
    env: QueueBindings,
    ctx: ExecutionContext,
  ): Promise<void>;
};

export async function processQueueBatch(
  messages: QueueEventMessage[],
  env: QueueBindings,
  batchId: string = crypto.randomUUID(),
): Promise<{ processed: number; skipped: number; objectKeys: string[] }> {
  const sanitizedMessages = messages.map((message) => queueEventMessageSchema.parse(message));
  let processed = 0;
  let skipped = 0;
  const byPartition = new Map<string, QueueEventMessage[]>();

  for (const message of sanitizedMessages) {
    const inserted = await insertProcessedQueueEvent(env.DB, message);
    if (!inserted) {
      skipped += 1;
      continue;
    }
    await incrementRollups(env.DB, message);
    const date = toIsoDate(new Date(message.ingestedAt));
    const partition = `${message.siteId}|${date}`;
    const current = byPartition.get(partition) ?? [];
    current.push(message);
    byPartition.set(partition, current);
    processed += 1;
  }

  const objectKeys: string[] = [];
  for (const [partition, events] of byPartition) {
    const [siteId, date] = partition.split("|");
    if (!siteId || !date) {
      throw new Error("Invalid archive partition");
    }
    const objectKey = `events/site_id=${siteId}/date=${date}/events-${batchId}.ndjson`;
    const body = `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
    await env.ARCHIVE_BUCKET.put(objectKey, body, {
      httpMetadata: { contentType: "application/x-ndjson; charset=utf-8" },
    });
    await recordArchiveObject(env.DB, {
      siteId,
      date,
      objectKey,
      eventCount: events.length,
      checksum: await sha256Hex(body),
    });
    objectKeys.push(objectKey);
  }

  return { processed, skipped, objectKeys };
}

const worker: WorkerExport = {
  async queue(batch, env, ctx) {
    const messages = batch.messages.map((message) => message.body);
    ctx.waitUntil(
      processQueueBatch(messages, env).catch((error) => {
        // biome-ignore lint/suspicious/noConsole: Queue failure logs are redacted before retry.
        console.error(JSON.stringify(redactObject({ name: error.name, message: error.message })));
        throw error;
      }),
    );
  },
};

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export default worker;
