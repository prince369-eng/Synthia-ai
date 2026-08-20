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
    "http://192.168.1.10/",
  ])("blocks non-public or credential-bearing destinations: %s", async value => {
    await expect(assertPublicWebDestination(value)).rejects.toThrow("not available for public-web research");
  });

  it("blocks a public-looking hostname that resolves to an internal address", async () => {
    lookup.mockResolvedValue([{ address: "10.20.30.40", family: 4 }]);
    await expect(assertPublicWebDestination("https://research.example.com/")).rejects.toThrow("exclusively to public internet addresses");
  });
});
