import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) {
      console.error("GROQ_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY not set in Supabase Edge Function secrets." }),
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

    const { prompt } = requestBody as {
      prompt?: string;
    };

    if (!prompt) {
      console.error("Missing required field: prompt");
      return new Response(
        JSON.stringify({ error: "Missing required field: prompt is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Groq error:", res.status, errBody);
      
      let errorMessage = "Groq API request failed.";
      
      if (res.status === 401 || res.status === 403) {
        errorMessage = "Groq API key is invalid or expired. Check your GROQ_API_KEY secret in Supabase.";
      } else if (res.status === 429) {
        errorMessage = "Groq API rate limit exceeded. Please try again in a moment.";
      } else if (res.status === 400) {
        errorMessage = "Invalid request to Groq API. The prompt might be too long or invalid.";
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const responseText = data.choices?.[0]?.message?.content?.trim() ?? "";

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
