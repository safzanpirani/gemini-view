export async function onRequest(context) {
  const { request, env } = context;

  // Debug logging
  console.log("Available env vars:", Object.keys(env));

  // Check for API key
  if (!env.GEMINI_API_KEY) {
    console.error("API key not found in environment");
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Only allow POST
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const geminiUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent";

  try {
    const clientPayload = await request.json();

    // Construct the payload for the Gemini API, adding thinkingBudget configuration
    const geminiApiPayload = {
      ...clientPayload,
      generationConfig: {
        ...(clientPayload.generationConfig || {}), // Preserve existing generationConfig (e.g., temperature)
        thinkingConfig: {
          ...((clientPayload.generationConfig && clientPayload.generationConfig.thinkingConfig) || {}), // Preserve other thinkingConfig settings if any
          thinkingBudget: 0, // Disable thinking
        },
      },
    };

    console.log("Sending payload to Gemini:", JSON.stringify(geminiApiPayload, null, 2));

    const response = await fetch(`${geminiUrl}?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiApiPayload), // Use the modified payload
    });

    const data = await response.json();
    console.log(
      "Received response from Gemini:",
      JSON.stringify(data, null, 2),
    );

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Worker error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}
