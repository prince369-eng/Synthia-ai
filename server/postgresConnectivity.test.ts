import { afterEach, describe, expect, it } from "vitest";
import { Client } from "pg";

let client: Client | undefined;
const connectionString = process.env.SYNTHIA_POSTGRES_URL;
const testWhenPostgresConfigured = connectionString ? it : it.skip;

afterEach(async () => {
  await client?.end();
  client = undefined;
});

describe("Synthia PostgreSQL connectivity", () => {
  testWhenPostgresConfigured("connects to the configured external PostgreSQL database with a lightweight readiness query", async () => {
    const parsed = new URL(connectionString!);
    const sslMode = parsed.searchParams.get("sslmode");
    client = new Client({
      connectionString,
      connectionTimeoutMillis: 8_000,
      ssl: sslMode && sslMode !== "disable" ? { rejectUnauthorized: false } : undefined,
    });
    await client.connect();
    const result = await client.query<{ ready: number }>("SELECT 1 AS ready");
    expect(result.rows).toEqual([{ ready: 1 }]);

    const schema = await client.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[]) ORDER BY table_name",
      [["projects", "task_attachments", "task_event_sequences", "task_events", "tasks", "users"]],
    );
    expect(schema.rows.map(row => row.table_name)).toEqual([
      "projects",
      "task_attachments",
      "task_event_sequences",
      "task_events",
      "tasks",
      "users",
    ]);
  }, 12_000);
});
