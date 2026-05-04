// Proxies reads of /hydroponics from Firebase Realtime DB to the app.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const host = Deno.env.get("FIREBASE_HOST");
    const auth = Deno.env.get("FIREBASE_AUTH");
    if (!host || !auth) {
      return new Response(
        JSON.stringify({ error: "FIREBASE_HOST or FIREBASE_AUTH not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Strip protocol if user pasted full URL
    const cleanHost = host.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const url = `https://${cleanHost}/hydroponics.json?auth=${encodeURIComponent(auth)}`;

    const r = await fetch(url);
    const text = await r.text();
    if (!r.ok) {
      return new Response(
        JSON.stringify({ error: `Firebase ${r.status}`, detail: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(text, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
