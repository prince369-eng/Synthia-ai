import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { corsAllowedOrigins, ENV } from "./env";
import { registerTaskEventStream } from "../realtime/taskEventStream";
import { runScheduledWorkflow } from "../scheduledWorkflows";
import { logger } from "../security/logger";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const allowedOrigins = new Set(corsAllowedOrigins({ publicAppUrl: ENV.publicAppUrl, isProduction: ENV.isProduction }));
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.has(origin)) {
      res.status(403).json({ error: "Origin is not permitted." });
      return;
    }
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    const scriptPolicy = ENV.isProduction ? "script-src 'self'" : "script-src 'self' 'unsafe-inline'";
    res.setHeader("Content-Security-Policy", `default-src 'self'; ${scriptPolicy}; object-src 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    next();
  });
  // Supports the largest supported base64 voice input while bounding memory use.
  app.use(express.json({ limit: "24mb" }));
  app.use(express.urlencoded({ limit: "24mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerTaskEventStream(app);
  app.post("/api/scheduled/workflow", runScheduledWorkflow);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // The managed preview can run from the same hashed client bundle as production.
  // This avoids browsers that block Vite's development-module graph while retaining Vite for local HMR.
  if (process.env.NODE_ENV === "development" && process.env.SYNTHIA_STATIC_PREVIEW !== "true") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    logger.warn({ event: "server_port_fallback", preferredPort, selectedPort: port }, "Preferred port is unavailable; using a fallback port");
  }

  server.listen(port, () => {
    logger.info({ event: "server_started", port }, "Server listening");
  });
}

startServer().catch(error => {
  logger.fatal({ event: "server_start_failed", errorKind: error instanceof Error ? error.name : "unknown" }, "Server failed to start");
});
