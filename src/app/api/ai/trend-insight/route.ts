import { NextRequest, NextResponse } from "next/server";

const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.productName !== "string" || !body.productName.trim()) {
    return NextResponse.json({ error: "productName is required" }, { status: 400 });
  }

  const { productName, niche = "", stage = "", growth = "" } = body as {
    productName: string;
    niche?: string;
    stage?: string;
    growth?: string;
  };

  const prompt = `You are an expert e-commerce trend analyst. A product called "${productName.trim()}" in the "${niche}" niche is currently in the "${stage}" trend stage with ${growth} growth.

Give a concise, actionable trend analysis in plain text (no markdown, no bullet symbols like - or *). Include:
1. Why this trend is happening (1 sentence)
2. Best sourcing strategy (1 sentence)
3. Top selling angle for Amazon/TikTok (1 sentence)
4. Competition warning or opportunity (1 sentence)

Keep total response under 80 words. Be specific and practical.`;

  let insight = "";
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
            generationConfig: { temperature: 0.65, maxOutputTokens: 200 },
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
        lastError = err?.error?.message ?? "Gemini API error";
        continue;
      }
      const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      insight = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      if (insight) break;
    }
    if (!insight) return NextResponse.json({ error: lastError || "All Gemini models failed" }, { status: 503 });

    return NextResponse.json({ ok: true, insight });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
