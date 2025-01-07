export async function onRequest(context) {
  const { request } = context;

  if (request.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const geminiUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

  try {
    const payload = await request.json();
    const response = await fetch(
      `${geminiUrl}?key=${context.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    // get the response data
    const data = await response.json();

    // return a new Response with the data
    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        // add CORS headers if needed
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
