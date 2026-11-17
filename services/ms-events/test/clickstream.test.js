import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { once } from "node:events";
import express from "express";

const temporaryDirectory = await mkdtemp(join(tmpdir(), "bookstore-clickstream-"));
const efsFile = join(temporaryDirectory, "efs", "clickstream.log");
const bufferFile = join(temporaryDirectory, "buffer", "events.log");

process.env.CLICKSTREAM_FILE_PATH = efsFile;
process.env.CLICKSTREAM_BUFFER_PATH = bufferFile;

const {
  closeClickstreamBufferWriter,
  initializeClickstreamBufferWriter,
  writeClickstreamBufferLine,
} = await import("../logging/clickstreamBufferWriter.js");
const {
  closeClickstreamFileWriter,
  initializeClickstreamFileWriter,
} = await import("../logging/clickstreamFileWriter.js");
const { default: internalRoutes } = await import("../routes/internalRoutes.js");
const { errorHandler } = await import("../middleware/errorHandler.js");

const app = express();
app.use("/internal", internalRoutes);
app.use(errorHandler);

let server;

test("rotates the local buffer and preserves sidecar log lines during ingestion", async () => {
  await initializeClickstreamBufferWriter();
  await initializeClickstreamFileWriter();
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  const firstLine = "x".repeat(6 * 1024 * 1024);
  const secondLongLine = "y".repeat(6 * 1024 * 1024);
  const secondLine = [
    "schema_version=1",
    "request_id=request-2",
    "session_id=session-2",
    "event_type=purchase",
    "latency_ms=12",
  ].join(" ");

  writeClickstreamBufferLine(firstLine);
  writeClickstreamBufferLine(secondLongLine);
  writeClickstreamBufferLine(secondLine);
  await closeClickstreamBufferWriter();

  const bufferDirectory = join(temporaryDirectory, "buffer");
  const bufferFiles = await readdir(bufferDirectory);
  const rotatedFile = bufferFiles.find((file) => file.startsWith("events.log."));
  assert.ok(rotatedFile, "the buffer should rotate after reaching 10 MiB");
  assert.equal(await readFile(join(bufferDirectory, rotatedFile), "utf8"), `${firstLine}\n`);
  assert.equal(
    await readFile(bufferFile, "utf8"),
    `${secondLongLine}\n${secondLine}\n`
  );

  const firstResponse = await fetch(
    `http://127.0.0.1:${server.address().port}/internal/events/ingest`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([
        { log: secondLine, timestamp: "2026-11-17T00:00:00Z" },
        { log: "schema_version=1 event_type=login" },
      ]),
    }
  );

  assert.equal(firstResponse.status, 200);
  assert.deepEqual(await firstResponse.json(), { written: 2 });
  assert.equal(
    await readFile(efsFile, "utf8"),
    `${secondLine}\nschema_version=1 event_type=login\n`
  );

  const secondResponse = await fetch(
    `http://127.0.0.1:${server.address().port}/internal/events/ingest`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lines: ["schema_version=1 event_type=logout"],
        records: [{ event_id: "structured-event" }],
      }),
    }
  );

  assert.equal(secondResponse.status, 200);
  assert.deepEqual(await secondResponse.json(), { written: 2 });
  assert.equal(
    await readFile(efsFile, "utf8"),
    `${secondLine}\nschema_version=1 event_type=login\nschema_version=1 event_type=logout\n{"event_id":"structured-event"}\n`
  );
});

test.after(async () => {
  if (server) {
    server.close();
    await once(server, "close");
  }

  await closeClickstreamFileWriter();
  await closeClickstreamBufferWriter();
  await rm(temporaryDirectory, { recursive: true, force: true });
});
