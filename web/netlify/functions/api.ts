/**
 * Netlify Functions proxy for the SORA Express backend.
 *
 * Configure BACKEND_URL in Netlify environment variables, e.g.
 * https://sora-multi-ai-backend.onrender.com
 * Do not include /api at the end; this function preserves the incoming /api path.
 */
export const config = { path: "/api/*" };

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

export default async (request: Request): Promise<Response> => {
  const backendUrl = process.env.BACKEND_URL?.trim();

  if (!backendUrl) {
    return Response.json(
      {
        error: "Backend is not configured",
        message: "Set BACKEND_URL in the Netlify site environment variables.",
      },
      { status: 503 },
    );
  }

  let target: URL;
  try {
    const base = new URL(backendUrl);
    if (base.protocol !== "https:" && base.hostname !== "localhost" && base.hostname !== "127.0.0.1") {
      return Response.json({ error: "BACKEND_URL must use HTTPS." }, { status: 500 });
    }
    target = new URL(new URL(request.url).pathname + new URL(request.url).search, base);
  } catch {
    return Response.json({ error: "BACKEND_URL is invalid." }, { status: 500 });
  }

  const headers = new Headers(request.headers);
  for (const name of HOP_BY_HOP_HEADERS) headers.delete(name);

  try {
    const method = request.method.toUpperCase();
    const body = method === "GET" || method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

    const upstream = await fetch(target, {
      method,
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(60_000),
    });

    const responseHeaders = new Headers(upstream.headers);
    for (const name of HOP_BY_HOP_HEADERS) responseHeaders.delete(name);
    responseHeaders.delete("set-cookie");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upstream error";
    return Response.json(
      { error: "Backend unavailable", message },
      { status: 502 },
    );
  }
};
