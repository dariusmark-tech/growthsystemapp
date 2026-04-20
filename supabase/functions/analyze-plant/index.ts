const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip data URL prefix if present, normalize to data URL for Gemini
    const dataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

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
                  plantName: { type: "string", description: "Common name of the plant, e.g. 'Tomato Plant'" },
                  stage: {
                    type: "string",
                    enum: ["Seedling", "Vegetative", "Fruiting", "Harvest"],
                    description: "Current growth stage",
                  },
                  confidence: {
                    type: "object",
                    description: "Confidence percentage (0-100) for each stage. Must sum to ~100.",
                    properties: {
                      Seedling: { type: "number" },
                      Vegetative: { type: "number" },
                      Fruiting: { type: "number" },
                      Harvest: { type: "number" },
                    },
                    required: ["Seedling", "Vegetative", "Fruiting", "Harvest"],
                    additionalProperties: false,
                  },
                  daysToNext: { type: "number", description: "Estimated days until the next growth stage" },
                  harvestDate: { type: "string", description: "Predicted harvest date in 'Month D, YYYY' format" },
                  nutrients: {
                    type: "array",
                    description: "Recommended nutrient levels (exactly 3: N, P, K).",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string", description: "e.g. 'Nitrogen (N)'" },
                        curr: { type: "number", description: "Current ppm estimate" },
                        tgt: { type: "number", description: "Target ppm" },
                        color: { type: "string", enum: ["amber", "green", "blue"] },
                      },
                      required: ["label", "curr", "tgt", "color"],
                      additionalProperties: false,
                    },
                  },
                  notes: { type: "string", description: "Brief observation about plant health" },
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
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "AI did not return structured output" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

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
