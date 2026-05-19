const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RoboflowPrediction {
  class: string;
  confidence: number; // 0..1
}

interface RoboflowResult {
  topClass: string;
  topConfidence: number; // 0..100
  predictions: RoboflowPrediction[];
}

async function callRoboflow(base64NoPrefix: string): Promise<RoboflowResult | null> {
  const apiKey = Deno.env.get("ROBOFLOW_API_KEY");
  const model = Deno.env.get("ROBOFLOW_MODEL"); // e.g. "my-project/3"
  if (!apiKey || !model) {
    console.warn("Roboflow not configured — skipping Roboflow classification");
    return null;
  }

  // Classification endpoint: classify.roboflow.com/<model>?api_key=...
  // Detection endpoint:      detect.roboflow.com/<model>?api_key=...
  // We try classify first, then fallback to detect.
  const urls = [
    `https://classify.roboflow.com/${model}?api_key=${apiKey}`,
    `https://detect.roboflow.com/${model}?api_key=${apiKey}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: base64NoPrefix,
      });
      if (!res.ok) {
        const text = await res.text();
        console.warn(`Roboflow ${url} returned ${res.status}: ${text}`);
        continue;
      }
      const data = await res.json();
      // Classification shape: { top, confidence, predictions: { className: { confidence } } } OR
      //                      { predictions: [ { class, confidence } ] }
      // Detection shape:     { predictions: [ { class, confidence, x, y, ... } ] }
      let predictions: RoboflowPrediction[] = [];

      if (Array.isArray(data.predictions)) {
        predictions = data.predictions
          .map((p: any) => ({ class: String(p.class ?? p.label ?? ""), confidence: Number(p.confidence ?? 0) }))
          .filter((p: RoboflowPrediction) => p.class);
      } else if (data.predictions && typeof data.predictions === "object") {
        predictions = Object.entries(data.predictions).map(([k, v]: [string, any]) => ({
          class: k,
          confidence: Number(v?.confidence ?? 0),
        }));
      }

      if (predictions.length === 0 && data.top) {
        predictions = [{ class: String(data.top), confidence: Number(data.confidence ?? 0) }];
      }

      if (predictions.length === 0) continue;

      predictions.sort((a, b) => b.confidence - a.confidence);
      const top = predictions[0];
      return {
        topClass: top.class,
        topConfidence: Math.round(top.confidence * 100),
        predictions: predictions.slice(0, 5),
      };
    } catch (e) {
      console.warn("Roboflow call failed:", e);
    }
  }
  return null;
}

async function callGemini(dataUrl: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("AI not configured");

  const systemPrompt = `You are an expert agricultural botanist and plant growth analyst.
Analyze the plant in the image and classify it. Identify the species (or best guess), the
current growth stage, your confidence in each possible stage, an estimate of days until the
next stage, and a predicted harvest date (assume today is ${new Date().toISOString().slice(0, 10)}).
Also recommend 3 key nutrient adjustments (N, P, K) with current vs target ppm based on the
visible health and growth stage. Be realistic — if you can't see a plant, say so.`;

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this plant photo." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "report_plant_analysis",
            description: "Report the structured plant classification and growth analysis.",
            parameters: {
              type: "object",
              properties: {
                plantName: { type: "string" },
                stage: { type: "string", enum: ["Seedling", "Vegetative", "Fruiting", "Harvest"] },
                confidence: {
                  type: "object",
                  properties: {
                    Seedling: { type: "number" },
                    Vegetative: { type: "number" },
                    Fruiting: { type: "number" },
                    Harvest: { type: "number" },
                  },
                  required: ["Seedling", "Vegetative", "Fruiting", "Harvest"],
                  additionalProperties: false,
                },
                daysToNext: { type: "number" },
                harvestDate: { type: "string" },
                nutrients: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      curr: { type: "number" },
                      tgt: { type: "number" },
                      color: { type: "string", enum: ["amber", "green", "blue"] },
                    },
                    required: ["label", "curr", "tgt", "color"],
                    additionalProperties: false,
                  },
                },
                notes: { type: "string" },
              },
              required: ["plantName", "stage", "confidence", "daysToNext", "harvestDate", "nutrients"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "report_plant_analysis" } },
    }),
  });

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    const err: any = new Error("AI analysis failed");
    err.status = aiResponse.status;
    err.body = errText;
    throw err;
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    throw new Error("AI did not return structured output");
  }
  return JSON.parse(toolCall.function.arguments);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;
    const base64NoPrefix = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;

    // Run Roboflow + Gemini in parallel
    const [roboflowRes, geminiRes] = await Promise.allSettled([
      callRoboflow(base64NoPrefix),
      callGemini(dataUrl),
    ]);

    if (geminiRes.status === "rejected") {
      const err: any = geminiRes.reason;
      if (err?.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (err?.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("Gemini error:", err?.status, err?.body || err?.message);
      return new Response(JSON.stringify({ error: err?.message || "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = geminiRes.value;
    const roboflow = roboflowRes.status === "fulfilled" ? roboflowRes.value : null;

    // Detect Gemini's "no plant" verdict from name or notes so Roboflow doesn't override it.
    const noPlantRe = /no\s*plant|not\s*a\s*plant|not\s*detected|cannot\s*identify|unidentified|does\s*not\s*(appear\s*to\s*)?contain\s*a?\s*plant|no\s*plant\s*visible|promotional|cartoon|illustration|game|character|monster|dragon/i;
    const geminiName = String(result?.plantName ?? "").trim();
    const geminiNotes = String(result?.notes ?? "");
    const geminiSaysNoPlant =
      !geminiName ||
      /^(n\/?a|na|none|unknown|null|undefined|-+)$/i.test(geminiName) ||
      noPlantRe.test(geminiName) ||
      noPlantRe.test(geminiNotes);

    if (geminiSaysNoPlant) {
      result.plantName = "No plant detected";
      result.noPlant = true;
      if (roboflow) result.roboflow = roboflow; // keep for debugging, but don't override name
    } else if (roboflow) {
      // Override plant name with Roboflow's prediction (your custom model wins)
      result.roboflow = roboflow;
      result.plantName = roboflow.topClass;
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("analyze-plant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
