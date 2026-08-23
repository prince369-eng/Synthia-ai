import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
}));

vi.mock("../security/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

import { getUserByOpenId, upsertUser } from "../db";
import { protectedProcedure, router, safeTrpcErrorKind } from "./trpc";

const authenticatedUser = {
  id: 12,
  openId: "owner-open-id",
  name: "Workspace Owner",
  email: "owner@example.test",
  loginMethod: "oauth",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const testRouter = router({
  applicationUserId: protectedProcedure.query(({ ctx }) => ctx.user.id),
});

describe("protected user provisioning", () => {
  it("classifies error types without returning a cause message", () => {
    expect(safeTrpcErrorKind({ name: "TRPCError", cause: new Error("postgres://operator:credential@database.internal") })).toBe("Error");
    expect(safeTrpcErrorKind({ name: "TRPCError" })).toBe("TRPCError");
  });

  it("mirrors the authenticated user and uses the PostgreSQL owner id", async () => {
    vi.mocked(upsertUser).mockResolvedValue();
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 73 } as never);

    const caller = testRouter.createCaller({ req: {} as never, res: {} as never, user: authenticatedUser });

    await expect(caller.applicationUserId()).resolves.toBe(73);
    expect(upsertUser).toHaveBeenCalledWith({
      openId: "owner-open-id",
      name: "Workspace Owner",
      email: "owner@example.test",
      loginMethod: "oauth",
    });
  });

  it("returns bounded workspace guidance when owner provisioning is unavailable", async () => {
    vi.mocked(upsertUser).mockRejectedValueOnce(new Error("postgres://credential-shaped-details"));

    const caller = testRouter.createCaller({ req: {} as never, res: {} as never, user: authenticatedUser });

    await expect(caller.applicationUserId()).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: "Your workspace is temporarily unavailable. Please try again shortly.",
    });
  });
});
