import { AwsClient } from "aws4fetch";

const HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

function getSettings(env) {
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET, AWS_REGION, API_ORIGIN } = env;
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_BUCKET || !AWS_REGION || !API_ORIGIN) {
    throw new Error("Missing required Worker configuration.");
  }

  const apiOrigin = new URL(API_ORIGIN);
  if (apiOrigin.protocol !== "https:" || apiOrigin.pathname !== "/" || apiOrigin.search || apiOrigin.hash) {
    throw new Error("API_ORIGIN must be an HTTPS origin without a path, query, or fragment.");
  }

  return { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET, AWS_REGION, apiOrigin };
}

function encodeObjectKey(pathname) {
  const path = pathname === "/" ? "/index.html" : pathname;
  const segments = path.slice(1).split("/");

  if (segments.some((segment) => segment === "." || segment === ".." || segment.includes("\0") || segment.includes("\\"))) {
    throw new Error("Invalid object key.");
  }

  return segments.map((segment) => encodeURIComponent(decodeURIComponent(segment))).join("/");
}

function createS3Url(bucket, region, key) {
  return new URL(`https://${bucket}.s3.${region}.amazonaws.com/${key}`);
}

function withCacheHeaders(response, cacheControl) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", cacheControl);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function serveObject(request, settings, key, cacheTtl) {
  const client = new AwsClient({
    accessKeyId: settings.AWS_ACCESS_KEY_ID,
    secretAccessKey: settings.AWS_SECRET_ACCESS_KEY,
    region: settings.AWS_REGION,
    service: "s3",
  });
  const originRequest = new Request(createS3Url(settings.AWS_BUCKET, settings.AWS_REGION, key), {
    method: request.method,
  });
  const signedRequest = await client.sign(originRequest);
  return fetch(signedRequest, {
    cf: {
      cacheEverything: true,
      cacheTtlByStatus: {
        "200-299": cacheTtl,
        "300-599": 0,
      },
    },
  });
}

async function handleApi(request, settings) {
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, settings.apiOrigin);
  const headers = new Headers(request.headers);
  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }
  headers.delete("host");

  const upstreamRequest = new Request(targetUrl, {
    method: request.method,
    headers,
    body: request.body,
    duplex: "half",
    redirect: "manual",
  });
  const response = await fetch(upstreamRequest, { cache: "no-store" });
  return withCacheHeaders(response, "no-store");
}

async function handleFrontend(request, settings) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" },
    });
  }

  const url = new URL(request.url);
  let key;
  try {
    key = encodeObjectKey(url.pathname);
  } catch {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const isHtml = key === "index.html" || !key.split("/").at(-1).includes(".");
  const cacheTtl = key.startsWith("assets/") ? 31_536_000 : 86_400;
  let response = await serveObject(request, settings, key, cacheTtl);

  if (response.status === 404 && isHtml && key !== "index.html") {
    response = await serveObject(request, settings, "index.html", 0);
    return withCacheHeaders(response, response.ok ? "no-cache" : "no-store");
  }

  if (!response.ok) {
    return withCacheHeaders(response, "no-store");
  }

  if (key === "index.html") {
    return withCacheHeaders(response, "no-cache");
  }

  const cacheControl = key.startsWith("assets/")
    ? "public, max-age=31536000, immutable"
    : "public, max-age=86400";
  return withCacheHeaders(response, cacheControl);
}

export default {
  async fetch(request, env) {
    const settings = getSettings(env);
    const url = new URL(request.url);

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return handleApi(request, settings);
    }

    return handleFrontend(request, settings);
  },
};
