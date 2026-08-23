import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { logger } from "../security/logger";
import { getUserByOpenId, upsertUser } from "../db";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error, ctx, path }) {
    const isInternal = error.code === "INTERNAL_SERVER_ERROR";
    logger.warn(
      {
        event: "trpc_error",
        code: error.code,
        path,
        userId: ctx?.user?.id,
      },
      "tRPC request failed",
    );
    return {
      ...shape,
      message: isInternal ? "An unexpected server error occurred." : shape.message,
      data: {
        ...shape.data,
        requestId: ctx?.req.headers["x-request-id"] ?? undefined,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  let applicationUserId: number;
  try {
    await upsertUser({
      openId: ctx.user.openId,
      name: ctx.user.name ?? null,
      email: ctx.user.email ?? null,
      loginMethod: ctx.user.loginMethod ?? null,
    });
    const applicationUser = await getUserByOpenId(ctx.user.openId);
    if (!applicationUser) throw new Error("Application user provisioning did not return a record");
    applicationUserId = applicationUser.id;
  } catch (error) {
    logger.error(
      { event: "protected_user_provisioning_failed", errorKind: error instanceof Error ? error.name : "unknown" },
      "Authenticated user provisioning failed",
    );
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Your workspace is temporarily unavailable. Please try again shortly.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: { ...ctx.user, id: applicationUserId },
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
