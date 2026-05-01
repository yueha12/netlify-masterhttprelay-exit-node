// MasterHttpRelay Exit Node for Netlify Functions (Node.js)
// Endpoints:
//   https://YOUR-SITE.netlify.app/.netlify/functions/relay
//   https://YOUR-SITE.netlify.app/relay   via redirect in netlify.toml

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

function json(obj, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
    body: JSON.stringify(obj),
  };
}

function sanitizeHeaders(h) {
  const out = {};
  if (!h || typeof h !== "object") return out;

  for (const [k, v] of Object.entries(h)) {
    if (!k) continue;
    const key = k.toLowerCase();
    if (STRIP_HEADERS.has(key)) continue;
    out[k] = String(v ?? "");
  }

  return out;
}

exports.handler = async function(event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return json({ ok: true });
    }

    if (event.httpMethod === "GET") {
      return json({
        ok: true,
        service: "MasterHttpRelay Netlify Functions Exit Node",
        method: "GET",
        hint: "Use POST with JSON body for relay requests.",
      });
    }

    if (event.httpMethod !== "POST") {
      return json(
        {
          e: "method_not_allowed",
          method: event.httpMethod,
        },
        405,
      );
    }

    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString("utf8")
      : (event.body || "");

    if (!rawBody.trim()) {
      return json({ e: "empty_body", from: "netlify_functions_exit_node" }, 400);
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (_err) {
      return json(
        {
          e: "bad_json_body",
          sample: rawBody.slice(0, 200),
          from: "netlify_functions_exit_node",
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
      return json({ e: "unauthorized" }, 401);
    }

    if (!/^https?:\/\//i.test(u)) {
      return json({ e: "bad_url", u }, 400);
    }

    let payload;
    if (typeof b64 === "string" && b64.length > 0) {
      payload = Buffer.from(b64, "base64");
    }

    const resp = await fetch(u, {
      method: m,
      headers: h,
      body: payload,
      redirect: "manual",
    });

    const arr = Buffer.from(await resp.arrayBuffer());

    const respHeaders = {};
    resp.headers.forEach((value, key) => {
      respHeaders[key] = value;
    });

    return json({
      s: resp.status,
      h: respHeaders,
      b: arr.toString("base64"),
    });
  } catch (err) {
    return json(
      {
        e: err && err.message ? err.message : String(err),
        from: "netlify_functions_exit_node",
      },
      500,
    );
  }
};
