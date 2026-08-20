import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Client, Pool } from "pg";

let client: Client | undefined;
const connectionString = process.env.SYNTHIA_POSTGRES_URL;
const testWhenPostgresConfigured = connectionString ? it : it.skip;
const testConcurrentAllocation = connectionString && process.env.SYNTHIA_RUN_CONCURRENCY_TEST === "true" ? it : it.skip;

function pgConnectionOptions() {
  const parsed = new URL(connectionString!);
  const sslMode = parsed.searchParams.get("sslmode");
  return {
    connectionString,
    connectionTimeoutMillis: 8_000,
    ssl: sslMode && sslMode !== "disable" ? { rejectUnauthorized: false } : undefined,
  };
}

afterEach(async () => {
  await client?.end();
  client = undefined;
});

describe("Synthia PostgreSQL connectivity", () => {
  testWhenPostgresConfigured("connects to the configured external PostgreSQL database with a lightweight readiness query", async () => {
    client = new Client(pgConnectionOptions());
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

  testConcurrentAllocation("allocates contiguous event sequences across concurrent writers without leaving test rows behind", async () => {
    const pool = new Pool({ ...pgConnectionOptions(), max: 16 });
    const openId = `synthia-concurrency-${randomUUID()}`;
    const taskId = randomUUID();
    let userId: number | undefined;

    try {
      const createdUser = await pool.query<{ id: number }>(
        "INSERT INTO users (open_id, name) VALUES ($1, $2) RETURNING id",
        [openId, "Synthia concurrency verification"],
      );
      userId = createdUser.rows[0]?.id;
      if (!userId) throw new Error("Concurrency verification could not create its isolated user row.");

      await pool.query(
        "INSERT INTO tasks (id, user_id, title, goal, plan, autonomy_settings) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)",
        [taskId, userId, "Event allocator verification", "Verify concurrent event allocation.", "[]", "{}"],
      );
      await pool.query("INSERT INTO task_event_sequences (task_id) VALUES ($1)", [taskId]);

      const sequenceNumbers = await Promise.all(Array.from({ length: 12 }, async (_, index) => {
        const transaction = await pool.connect();
        try {
          await transaction.query("BEGIN");
          const claimed = await transaction.query<{ sequence_number: number | string }>(
            "UPDATE task_event_sequences SET next_sequence_number = next_sequence_number + 1, updated_at = NOW() WHERE task_id = $1 RETURNING next_sequence_number AS sequence_number",
            [taskId],
          );
          const rawSequenceNumber = claimed.rows[0]?.sequence_number;
          const sequenceNumber = Number(rawSequenceNumber);
          if (!Number.isSafeInteger(sequenceNumber) || sequenceNumber < 1) throw new Error("Concurrent event writer could not reserve a valid sequence number.");
          await transaction.query(
            "INSERT INTO task_events (id, task_id, sequence_number, type, payload) VALUES ($1, $2, $3, $4, $5::jsonb)",
            [randomUUID(), taskId, sequenceNumber, "tool_result", JSON.stringify({ verificationWriter: index })],
          );
          await transaction.query("COMMIT");
          return sequenceNumber;
        } catch (error) {
          await transaction.query("ROLLBACK").catch(() => undefined);
          throw error;
        } finally {
          transaction.release();
        }
      }));

      expect([...sequenceNumbers].sort((left, right) => left - right)).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
      const eventCount = await pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM task_events WHERE task_id = $1", [taskId]);
      expect(eventCount.rows[0]?.count).toBe("12");
    } finally {
      await pool.query("DELETE FROM tasks WHERE id = $1", [taskId]).catch(() => undefined);
      if (userId) await pool.query("DELETE FROM users WHERE id = $1", [userId]).catch(() => undefined);
      await pool.end();
    }
  }, 20_000);
});
