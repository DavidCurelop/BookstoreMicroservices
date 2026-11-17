import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.js";

const env = {
  AWS_ACCESS_KEY_ID: "test-access-key",
  AWS_SECRET_ACCESS_KEY: "test-secret-key",
  AWS_BUCKET: "bookstore-test",
  AWS_REGION: "us-east-1",
  API_ORIGIN: "https://api-origin.example.com",
};

test("proxies API requests with cookies, authorization and query string without caching", async (t) => {
  const originalFetch = globalThis.fetch;
  let upstreamRequest;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (request, options) => {
    upstreamRequest = request;
    assert.equal(options.cache, "no-store");
    return new Response("ok", {
      headers: {
        "Cache-Control": "public, max-age=600",
        "Set-Cookie": "session=refreshed; HttpOnly; Secure",
      },
    });
  };

  const request = new Request("https://bookstore.example.com/api/orders?page=2", {
    method: "POST",
    headers: {
      Authorization: "Bearer token",
      Cookie: "session=abc",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isbn: "978123", quantity: 1 }),
  });
  const response = await worker.fetch(request, env);

  assert.equal(upstreamRequest.url, "https://api-origin.example.com/api/orders?page=2");
  assert.equal(upstreamRequest.method, "POST");
  assert.equal(upstreamRequest.headers.get("authorization"), "Bearer token");
  assert.equal(upstreamRequest.headers.get("cookie"), "session=abc");
  assert.equal(await upstreamRequest.text(), JSON.stringify({ isbn: "978123", quantity: 1 }));
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("set-cookie"), "session=refreshed; HttpOnly; Secure");
  assert.equal(await response.text(), "ok");
});

test("serves static objects with long-lived cache headers", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (request, options) => {
    assert.match(request.url, /bookstore-test\.s3\.us-east-1\.amazonaws\.com\/assets\/app-123\.js$/);
    assert.match(request.headers.get("authorization"), /^AWS4-HMAC-SHA256 /);
    assert.equal(options.cf.cacheTtlByStatus["200-299"], 31_536_000);
    assert.equal(options.cf.cacheTtlByStatus["300-599"], 0);
    return new Response("bundle", { headers: { "Content-Type": "application/javascript" } });
  };

  const response = await worker.fetch(new Request("https://bookstore.example.com/assets/app-123.js"), env);
  assert.equal(response.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.equal(await response.text(), "bundle");
});

test("falls back to index.html for client routes but not missing assets", async (t) => {
  const originalFetch = globalThis.fetch;
  const requestedKeys = [];
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (request) => {
    const key = new URL(request.url).pathname.slice(1);
    requestedKeys.push(key);
    if (key === "index.html") {
      return new Response("<main>Bookstore</main>", { headers: { "Content-Type": "text/html" } });
    }
    return new Response("missing", { status: 404 });
  };

  const routeResponse = await worker.fetch(new Request("https://bookstore.example.com/book/978123"), env);
  const assetResponse = await worker.fetch(new Request("https://bookstore.example.com/assets/missing.js"), env);

  assert.equal(routeResponse.status, 200);
  assert.equal(routeResponse.headers.get("cache-control"), "no-cache");
  assert.equal(await routeResponse.text(), "<main>Bookstore</main>");
  assert.equal(assetResponse.status, 404);
  assert.equal(assetResponse.headers.get("cache-control"), "no-store");
  assert.deepEqual(requestedKeys, ["book/978123", "index.html", "assets/missing.js"]);
});

test("rejects unsupported frontend methods without calling S3", async () => {
  const response = await worker.fetch(
    new Request("https://bookstore.example.com/cart", { method: "POST" }),
    env,
  );
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, HEAD");
});

test("does not cache upstream errors", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () => new Response("origin failure", { status: 500 });

  const response = await worker.fetch(new Request("https://bookstore.example.com/error.js"), env);
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("requires a secure API origin", async () => {
  await assert.rejects(
    worker.fetch(new Request("https://bookstore.example.com/"), {
      ...env,
      API_ORIGIN: "http://api-origin.example.com",
    }),
    /API_ORIGIN must be an HTTPS origin/,
  );
});
