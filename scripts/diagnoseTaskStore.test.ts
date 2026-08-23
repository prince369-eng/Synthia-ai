import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("task-store diagnostic contract", () => {
  it("checks every table and column used by the initial task-creation transaction without exposing connection details", () => {
    const source = fs.readFileSync(path.resolve(import.meta.dirname, "diagnoseTaskStore.mjs"), "utf8");

    for (const table of ["tasks", "task_event_sequences", "task_events", "task_messages"]) {
      expect(source).toContain(table);
    }
    for (const column of ["next_sequence_number", "sequence_number", "autonomy_settings", "estimated_credits_max"]) {
      expect(source).toContain(column);
    }
    expect(source).not.toContain("console.log(connectionString");
  });
});
