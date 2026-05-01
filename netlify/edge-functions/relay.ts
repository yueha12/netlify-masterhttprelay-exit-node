// MasterHttpRelay Exit Node for Netlify Edge Functions
// Endpoint: https://YOUR-SITE.netlify.app/relay
// Keep PSK exactly the same as config.json -> exit_node.psk

const PSK = "MRAMIRVAHEDI";

const STRIP_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "proxy-connection",
  "proxy-authorization",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
  "x-real-ip",
  "forwarded",
  "via",
]);

function decodeBase64ToBytes(input: string): Uint8Array {
  const bin = atob(input);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function encodeBytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    bin += String.fromCharCode(...chunk);
  }

  return btoa(bin);
}

function sanitizeHeaders(h: unknown): Record<string, string> {
  const out: Record<string, string> = {};

  if (!h || typeof h !== "object") {
    return out;
  }

  for (const [k, v] of Object.entries(h as Record<string, unknown>)) {
    if (!k) continue;

    const key = k.toLowerCase();
    if (STRIP_HEADERS.has(key)) continue;

    out[k] = String(v ?? "");
  }

  return out;
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

async function readJsonSafely(req: Request): Promise<any> {
  const text = await req.text();

  if (!text || !text.trim()) {
    throw new Error("empty_body");
  }

  try {
    return JSON.parse(text);
  } catch (_err) {
    throw new Error("bad_json_body: " + text.slice(0, 200));
  }
}

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method === "OPTIONS") {
      return json({ ok: true });
    }

    if (req.method === "GET") {
      return json({
        ok: true,
        service: "MasterHttpRelay Netlify Exit Node",
        method: "GET",
        hint: "Use POST with JSON body for relay requests.",
      });
    }

    if (req.method !== "POST") {
      return json(
        {
          e: "method_not_allowed",
          method: req.method,
        },
        405,
      );
    }

    const body = await readJsonSafely(req);

    if (!body || typeof body !== "object") {
      return json(
        {
          e: "bad_json",
          detail: "body is not an object",
        },
        400,
      );
    }

    const k = String(body.k ?? "");
    const u = String(body.u ?? "");
    const m = String(body.m ?? "GET").toUpperCase();
    const h = sanitizeHeaders(body.h);
    const b64 = body.b;

    if (k !== PSK) {
      return json(
        {
          e: "unauthorized",
        },
        401,
      );
    }

    if (!/^https?:\/\//i.test(u)) {
      return json(
        {
          e: "bad_url",
          u,
        },
        400,
      );
    }

    let payload: Uint8Array | undefined = undefined;

    if (typeof b64 === "string" && b64.length > 0) {
      payload = decodeBase64ToBytes(b64);
    }

    const resp = await fetch(u, {
      method: m,
      headers: h,
      body: payload,
      redirect: "manual",
    });

    const data = new Uint8Array(await resp.arrayBuffer());

    const respHeaders: Record<string, string> = {};
    resp.headers.forEach((value, key) => {
      respHeaders[key] = value;
    });

    return json({
      s: resp.status,
      h: respHeaders,
      b: encodeBytesToBase64(data),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    return json(
      {
        e: message,
        from: "netlify_exit_node",
      },
      500,
    );
  }
}
