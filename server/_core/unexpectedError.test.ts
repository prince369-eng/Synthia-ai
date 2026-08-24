import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { unexpectedRequestErrorResponse } from "./unexpectedError";

describe("unexpectedRequestErrorResponse", () => {
  it("returns a fixed 500 response without serializing exception details", () => {
    expect(unexpectedRequestErrorResponse()).toEqual({
      status: 500,
      event: "unexpected_request_error",
      body: { error: "INTERNAL_SERVER_ERROR" },
    });
  });

  it("installs the contract as terminal Express middleware after application routes", () => {
    const serverSource = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

    expect(serverSource).toContain('import { unexpectedRequestErrorResponse } from "./unexpectedError";');
    expect(serverSource).toContain("const response = unexpectedRequestErrorResponse();");
    expect(serverSource).toContain('res.status(response.status).json(response.body);');
  });
});
