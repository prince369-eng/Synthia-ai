# Developer Guide

This guide is for maintainers changing production code. Read [Architecture](ARCHITECTURE.md) and [Change Map](CHANGE_MAP.md) before editing an unfamiliar area.

## Core change rule

A Synthia feature is complete only when its **schema or input contract**, **server authorization**, **UI states**, **error boundary**, **tests**, and **documentation** agree. Do not add a visual control without defining what it does when unavailable, unauthorized, pending, successful, and failed.

## Safe implementation sequence

| Step | Required work | Why it matters |
|---|---|---|
| 1 | Write the domain contract and state transitions. | Prevents the UI from inventing unvalidated states. |
| 2 | Add Zod validation and a protected tRPC procedure. | Ensures untrusted browser input is bounded. |
| 3 | Add owner-scoped persistence helpers. | Prevents cross-user access. |
| 4 | Add UI with loading, empty, error, and approval states. | Makes behavior understandable and accessible. |
| 5 | Add deterministic tests. | Preserves security and regression boundaries. |
| 6 | Run full verification and update docs. | Prevents an isolated local change from becoming a broken release. |

## Server procedures

Define API procedures in `server/routers.ts` or a feature router registered there. Use `protectedProcedure` for user data or any meaningful action. Parse every input with Zod, apply rate limits to mutations, and scope calls with `ctx.user.id`. Preserve `TRPCError` values that are deliberately safe; map unexpected errors to bounded recovery guidance and structured logs.

```ts
const example = protectedProcedure
  .input(z.object({ label: z.string().trim().min(1).max(80) }))
  .mutation(async ({ ctx, input }) => {
    await enforceUserMutationLimit(ctx.user.id, "example-create", 30, 3_600);
    try {
      return await createExampleForUser({ userId: ctx.user.id, label: input.label });
    } catch (error) {
      logger.warn({ event: "example_create_failed", userId: ctx.user.id, errorKind: error instanceof Error ? error.name : "unknown" }, "Example could not be created");
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The item could not be saved. Please retry." });
    }
  });
```

Do not return `error.message` from provider, database, queue, filesystem, or device tooling. Do not log secrets. Do not use a raw `userId` supplied by the client.

## Data and migrations

Add tables and indexes in `drizzle/schema.ts`, generate a migration, inspect the SQL, and apply it only through the correct target-database path. Keep migrations additive whenever possible. For a nontrivial state machine, store an immutable event or approval record rather than overwriting historical decision data.

Before a destructive schema change, create a checkpoint, verify dependencies, and make a rollback plan. Database records are not automatically reversible.

## React and route changes

Use `trpc.*` hooks rather than new fetch clients. The client may import pure contracts from `@shared/`, but never import `server/_core` or an integration adapter. Add routes in `client/src/App.tsx`; surface navigation through `SynthiaAppShell` only when a page has a clear user value and return path.

Every data page must handle loading, empty, unavailable, and error states. Render errors through `clientErrorMessage` rather than outputting raw exception text.

## External integrations

Adapters live behind server boundaries. Add an integration only after deciding the exact data scope, approval requirement, credential location, rate limit, and user-visible failure behavior. Unit tests must mock outbound calls. Never use routine test runs to consume free-tier quota.

## Network Lab changes

The deployed service is a control plane, not a virtualization host. Do not add `child_process`, `VBoxManage`, SSH-to-device, network scanning, bridged adapters, NAT adapters, port forwarding, or vendor images to server code. The future Linux runner is a separate local package. Any local runner must receive only a public verification key and must require explicit operator confirmation.

## Review checklist

- Does every mutation have a Zod input, owner scope, rate limit, and safe error path?
- Is any new data indexed for its query pattern?
- Can a user see configuration/provider/database diagnostics they should not see?
- Does the UI explain unavailable or approval-gated state without pretending it ran?
- Are secrets, `.env`, vendor images, evidence, generated bundles, and local keys excluded from Git?
- Did `pnpm check`, `pnpm test`, `pnpm build`, and `git diff --check` pass?
