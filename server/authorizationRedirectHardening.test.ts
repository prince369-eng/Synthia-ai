import { describe, expect, it } from "vitest";
import { trustedPipedreamAuthorizationUrl } from "./integrations/appConnectors";

describe("connector authorization redirect hardening", () => {
  it("accepts only canonical HTTPS provider-hosted authorization URLs", () => {
    const url = trustedPipedreamAuthorizationUrl("https://connect.pipedream.com/connect/session?token=opaque");
    expect(url.toString()).toBe("https://connect.pipedream.com/connect/session?token=opaque");
  });

  it.each([
    "http://connect.pipedream.com/connect/session",
    "https://pipedream.com/connect/session",
    "https://connect.pipedream.com.evil.example/connect/session",
    "https://user:password@connect.pipedream.com/connect/session",
    "https://connect.pipedream.com:8443/connect/session",
    "javascript:alert(1)",
  ])("rejects untrusted authorization destination %s", value => {
    expect(() => trustedPipedreamAuthorizationUrl(value)).toThrow("untrusted destination");
  });
});
