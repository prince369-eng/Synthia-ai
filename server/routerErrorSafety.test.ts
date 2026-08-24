import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const routersSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");

describe("tRPC mutation error safety", () => {
  it("does not return raw caught exception text from reviewed Skill, Office export, or Voice Mode paths", () => {
    expect(routersSource).not.toContain('message: message.slice(0, 600)');
    expect(routersSource).not.toContain('message: `The Office export could not be stored. ${message}`');
    expect(routersSource).not.toContain('code === "PRECONDITION_FAILED" ? message');
    expect(routersSource).toContain('message: "A reviewed Skill draft is not available right now. Please retry shortly."');
    expect(routersSource).toContain('message: "The Office export could not be stored. Please retry shortly."');
    expect(routersSource).toContain('message: "Voice Mode is not available for this task right now."');
  });

  it("uses fixed unavailable messages for task-control mutation catch paths", () => {
    expect(routersSource).not.toContain('code: "NOT_FOUND", message });');
    expect(routersSource).toContain('message: "That handoff policy is unavailable."');
    expect(routersSource).toContain('message: "That recovery playbook is unavailable."');
    expect(routersSource).toContain('message: "That policy pack is unavailable."');
    expect(routersSource).toContain('message: "That quality budget is unavailable."');
    expect(routersSource).toContain('message: "That browser change set is unavailable."');
  });
});
