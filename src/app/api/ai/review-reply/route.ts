import { NextRequest, NextResponse } from "next/server";

const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.reviewText !== "string" || !body.reviewText.trim()) {
    return NextResponse.json({ error: "reviewText is required" }, { status: 400 });
  }

  const { reviewText, rating = 3, sentiment = "negative" } = body as {
    reviewText: string;
    rating?: number;
    sentiment?: string;
  };

  const prompt = `You are a professional Amazon seller responding to a customer review. Write a concise, empathetic, and professional public reply to this ${sentiment} customer review (${rating}/5 stars):

"${reviewText.trim()}"

Rules:
- Keep reply under 100 words
- Be empathetic and professional, never defensive
- Thank the customer for their feedback
- For negative reviews: acknowledge the issue and offer a resolution (refund/replacement/support contact)
- For positive reviews: express gratitude and reinforce the brand
- Do NOT use generic phrases like "We're sorry to hear that"
- Reply in plain text only, no markdown, no quotes around the reply`;

  let reply = "";
  let lastError = "";
  try {
    for (const model of GEMINI_MODELS) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.6, maxOutputTokens: 256 },
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
        lastError = err?.error?.message ?? "Gemini API error";
        continue;
      }
      const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      if (reply) break;
    }
    if (!reply) return NextResponse.json({ error: lastError || "All Gemini models failed" }, { status: 503 });

    return NextResponse.json({ ok: true, reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
