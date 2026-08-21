import { PipedreamClient } from "@pipedream/sdk";
import { describe, expect, it } from "vitest";
import { ENV } from "../_core/env";

const runCredentialValidation = process.env.RUN_CONNECTOR_CREDENTIAL_VALIDATION === "1";

describe("configured app connector credentials", () => {
  it.runIf(runCredentialValidation && Boolean(ENV.pipedreamClientId && ENV.pipedreamClientSecret && ENV.pipedreamProjectId))("validates Pipedream credentials with a read-only account-list request", async () => {
    const client = new PipedreamClient({
      clientId: ENV.pipedreamClientId,
      clientSecret: ENV.pipedreamClientSecret,
      projectId: ENV.pipedreamProjectId,
    });

    await expect(client.accounts.list({ limit: 1 })).resolves.toBeDefined();
  });

  it.runIf(runCredentialValidation && Boolean(ENV.composioApiKey && ENV.composioAuthConfigId))("validates Composio credentials with a read-only Auth Config collection lookup", async () => {
    const response = await fetch(`${ENV.composioBaseUrl.replace(/\/$/, "")}/api/v3.1/auth_configs?limit=1`, {
      headers: { "x-api-key": ENV.composioApiKey },
    });

    expect(response.ok).toBe(true);
  });
});
