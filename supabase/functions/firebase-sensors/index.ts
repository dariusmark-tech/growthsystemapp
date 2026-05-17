// Proxies reads of /hydroponics from Firebase Realtime DB to the app.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url);
    } catch (e) {
      lastErr = e;
      // brief backoff before retry (handles transient TLS handshake EOF)
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw lastErr;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const host = Deno.env.get("FIREBASE_HOST");
    const auth = Deno.env.get("FIREBASE_AUTH");
    if (!host || !auth) {
      return new Response(
        JSON.stringify({ error: "FIREBASE_HOST or FIREBASE_AUTH not configured" }),
        { status: 500, headers: jsonHeaders }
      );
    }

    const cleanHost = host.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const url = `https://${cleanHost}/hydroponics.json?auth=${encodeURIComponent(auth)}`;

    let r: Response;
    try {
      r = await fetchWithRetry(url, 3);
    } catch (e) {
      // Network/TLS failure reaching Firebase — return 200 with fallback flag
      // so the client doesn't crash with a 500.
      const msg = e instanceof Error ? e.message : String(e);
      return new Response(
        JSON.stringify({ error: "UPSTREAM_UNAVAILABLE", detail: msg, fallback: true }),
        { status: 200, headers: jsonHeaders }
      );
    }

    const text = await r.text();
    if (!r.ok) {
      return new Response(
        JSON.stringify({ error: `Firebase ${r.status}`, detail: text, fallback: true }),
        { status: 200, headers: jsonHeaders }
      );
    }

    return new Response(text, { status: 200, headers: jsonHeaders });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown", fallback: true }),
      { status: 200, headers: jsonHeaders }
    );
  }
});
