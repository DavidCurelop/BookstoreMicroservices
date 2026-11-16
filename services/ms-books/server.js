import express from "express";
import cors from "cors";

import { config } from "./config/env.js";
import { AppError } from "./errors/AppError.js";
import {
  closeDatabaseConnection,
  verifyDatabaseConnection,
} from "./config/database.js";
import { logger } from "./config/logger.js";
import {
  closeClickstreamFileWriter,
  initializeClickstreamFileWriter,
} from "./logging/clickstreamFileWriter.js";
import { accessLogger } from "./middleware/accessLogger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import bookRoutes from "./routes/bookRoutes.js";
import internalRoutes from "./routes/internalRoutes.js";

const app = express();

const corsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin || config.http.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new AppError("Origin is not allowed by CORS policy", 403, "CORS_ORIGIN_DENIED"));
  },
};

app.set("trust proxy", config.http.trustProxyHops);
app.disable("x-powered-by");

app.use(accessLogger);
app.use(cors(corsOptions));
app.use(express.json({ limit: config.http.jsonBodyLimit }));

app.get("/health", async (req, res) => {
  await verifyDatabaseConnection();
  res.status(200).json({
    status: "ok",
    service: config.app.serviceName,
  });
});

app.use("/api/books", bookRoutes);

// Cluster-internal only (ms-orders): the public Ingress must not route /internal.
app.use("/internal", internalRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

let server;

const startServer = async () => {
  await verifyDatabaseConnection();
  await initializeClickstreamFileWriter();

  server = app.listen(config.app.port, () => {
    logger.info("HTTP server started", { port: config.app.port });
  });
};

const shutdown = async (signal) => {
  logger.info("Shutdown requested", { signal });

  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  await closeClickstreamFileWriter();
  await closeDatabaseConnection();
  logger.info("Shutdown completed", { signal });
  process.exit(0);
};

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () =>
    shutdown(signal).catch((error) => {
      logger.error("Graceful shutdown failed", { error: error.message });
      process.exit(1);
    })
  );
}

startServer().catch((error) => {
  logger.error("Application failed to start", { error: error.message });
  process.exit(1);
});
