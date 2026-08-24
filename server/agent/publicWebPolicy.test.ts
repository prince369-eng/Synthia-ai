import { afterEach, describe, expect, it, vi } from "vitest";

const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup }));

import { assertPublicWebDestination } from "./publicWebPolicy";

afterEach(() => vi.resetAllMocks());

describe("public-web destination policy", () => {
  it("permits a credential-free HTTP(S) public hostname that resolves publicly", async () => {
    lookup.mockResolvedValue([{ address: "142.250.72.14", family: 4 }]);
    await expect(assertPublicWebDestination("https://www.google.com/search?q=synthia")).resolves.toMatchObject({ hostname: "www.google.com" });
  });

  it.each([
    "file:///workspace/secret.txt",
    "http://localhost:3000",
    "https://metadata.google.internal/computeMetadata/v1/",
    "http://169.254.169.254/latest/meta-data/",
    "https://user:password@example.com/",
    "https://www.google.com:8443/",
    "http://192.168.1.10/",
  ])("blocks non-public or credential-bearing destinations: %s", async value => {
    await expect(assertPublicWebDestination(value)).rejects.toThrow("not available for public-web research");
  });

  it("blocks a public-looking hostname that resolves to an internal address", async () => {
    lookup.mockResolvedValue([{ address: "10.20.30.40", family: 4 }]);
    await expect(assertPublicWebDestination("https://research.example.com/")).rejects.toThrow("exclusively to public internet addresses");
  });

  it.each([
    { address: "::ffff:127.0.0.1", family: 6 },
    { address: "::ffff:7f00:1", family: 6 },
    { address: "::ffff:169.254.169.254", family: 6 },
    { address: "100::1", family: 6 },
    { address: "198.51.100.42", family: 4 },
    { address: "203.0.113.42", family: 4 },
  ])("blocks special-use DNS address $address", async ({ address, family }) => {
    lookup.mockResolvedValue([{ address, family }]);
    await expect(assertPublicWebDestination("https://research.example.com/")).rejects.toThrow("exclusively to public internet addresses");
  });
});
