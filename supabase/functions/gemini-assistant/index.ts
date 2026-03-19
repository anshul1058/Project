import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("GEMINI_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not set in Supabase Edge Function secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseErr) {
      console.error("Failed to parse request JSON:", parseErr);
      return new Response(
        JSON.stringify({ error: "Invalid JSON request body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text, type, question } = requestBody as {
      text?: string;
      type?: string;
      question?: string;
    };

    if (!text || !type) {
      console.error("Missing required fields:", { hasText: !!text, hasType: !!type });
      return new Response(
        JSON.stringify({ error: "Missing required fields: text and type are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const truncated = (text || "").substring(0, 30000);

    let prompt = "";
    if (type === "summary") {
      prompt = `You are an expert tutor. Summarize the following study material text. Make it clear, concise, and easy for a student to understand. Keep it under 150 words. Format your response in simple markdown (use **bold** for emphasis).\n\nTEXT:\n${truncated}`;
    } else if (type === "notes") {
      prompt = `You are an expert tutor. Extract the 4-6 most important key concepts or facts from the following text. Provide them as a bulleted list of short notes. Format your response in clean markdown.\n\nTEXT:\n${truncated}`;
    } else if (type === "questions") {
      prompt = `Create 8–10 high-quality short-answer questions based on the key concepts in the following text. Provide a clear, detailed answer directly below each question in *italics*. Format everything in markdown.\n\nTEXT:\n${truncated}`;
    } else if (type === "mindmap") {
      prompt = `Analyze the following study material text and extract exactly 6 key distinct concepts to form a mind map. You must output ONLY raw, valid JSON. Do NOT include markdown backticks.

The JSON structure MUST exactly match this format:
{"title": "Main Topic","left":[{"title": "Concept 1", "desc": "10-15 word description."},{"title": "Concept 2", "desc": "10-15 word description."},{"title": "Concept 3", "desc": "10-15 word description."}],"right":[{"title": "Concept 4", "desc": "10-15 word description."},{"title": "Concept 5", "desc": "10-15 word description."},{"title": "Concept 6", "desc": "10-15 word description."}]}

Keep "title" short (1-3 words). Keep "desc" concise (1-2 short sentences).

TEXT:\n${truncated}`;
    } else if (type === "followup" && question) {
      prompt = `You are an AI study assistant helping a student with a PDF they uploaded. Use ONLY the following text content as your source of truth, and then answer the follow-up question. If the answer is unclear from the text, say so honestly.\n\nPDF TEXT:\n${truncated}\n\nSTUDENT QUESTION:\n${question}`;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid type or missing question for followup." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("AI service error:", res.status, errBody);
      
      let errorMessage = "AI service request failed.";
      
      if (res.status === 401 || res.status === 403) {
        errorMessage = "AI API key is invalid or expired. Check your secrets in Supabase.";
      } else if (res.status === 429) {
        errorMessage = "AI API rate limit exceeded. Please try again in a moment.";
      } else if (res.status === 400) {
        errorMessage = "Invalid request to AI service. The text might be too short or invalid.";
      } else if (res.status === 500 || res.status === 503) {
        errorMessage = "AI service is temporarily unavailable. Try again in a moment.";
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    let responseText =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() ?? "";

    if (type === "mindmap") {
      if (responseText.startsWith("```json")) responseText = responseText.slice(7);
      if (responseText.startsWith("```")) responseText = responseText.slice(3);
      if (responseText.endsWith("```")) responseText = responseText.slice(0, -3);
      responseText = responseText.trim();
    }

    return new Response(JSON.stringify({ data: responseText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown server error";
    console.error("Edge Function exception:", errorMessage, e);
    return new Response(
      JSON.stringify({ error: `Server error: ${errorMessage}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
