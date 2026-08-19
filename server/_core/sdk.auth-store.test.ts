import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../authDb", () => ({
  getAuthUserByOpenId: vi.fn(),
  upsertAuthUser: vi.fn(),
}));

import * as authDb from "../authDb";
import { COOKIE_NAME } from "../../shared/const";
import { SDKServer } from "./sdk";

const now = new Date("2026-08-19T00:00:00.000Z");
const managedUser = {
  id: 17,
  openId: "managed-user-17",
  name: "Synthia User",
  email: "user@example.test",
  loginMethod: "google",
  role: "user" as const,
  createdAt: now,
  updatedAt: now,
  lastSignedIn: now,
};

describe("SDKServer.authenticateRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the managed account user store without requiring the external task database", async () => {
    const server = new SDKServer();
    const session = await server.createSessionToken(managedUser.openId, {
      name: "Synthia User",
    });
    vi.mocked(authDb.getAuthUserByOpenId).mockResolvedValue(managedUser);
    vi.mocked(authDb.upsertAuthUser).mockResolvedValue();

    const result = await server.authenticateRequest({
      headers: { cookie: `${COOKIE_NAME}=${session}` },
    } as never);

    expect(authDb.getAuthUserByOpenId).toHaveBeenCalledWith(managedUser.openId);
    expect(authDb.upsertAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({ openId: managedUser.openId }),
    );
    expect(result).toMatchObject({ id: managedUser.id, openId: managedUser.openId });
  });
});
