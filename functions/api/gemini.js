export async function onRequest(context) {
  const { request } = context;

  // only allow POST
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

    return response;
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
