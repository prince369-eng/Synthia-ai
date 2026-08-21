import { describe, expect, it } from "vitest";
import { appConnectorProviders, appConnectorReadiness } from "./appConnectors";

describe("app connector authorization boundaries", () => {
  it("describes only the explicit user-authorized provider routes", () => {
    expect(appConnectorProviders).toEqual(["zapier", "pipedream", "composio"]);
    expect(appConnectorReadiness().map(item => item.provider)).toEqual(["zapier", "pipedream", "composio"]);
    const boundaries = appConnectorReadiness().map(item => item.boundary.toLowerCase());
    expect(boundaries[0]).toContain("task-scoped proposal");
    expect(boundaries[1]).toContain("credential");
    expect(boundaries[2]).toContain("explicit approval");
  });

  it("uses embedded authorization only for Zapier and redirect authorization for Pipedream and Composio", () => {
    const readiness = new Map(appConnectorReadiness().map(item => [item.provider, item.authorization]));

    expect(readiness.get("zapier")).toBe("embedded");
    expect(readiness.get("pipedream")).toBe("redirect");
    expect(readiness.get("composio")).toBe("redirect");
  });
});
