import { NextRequest, NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-2.0-flash";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.productName !== "string" || !body.productName.trim()) {
    return NextResponse.json({ error: "productName is required" }, { status: 400 });
  }

  const { productName, keywords = "", platform = "Amazon" } = body as {
    productName: string;
    keywords?: string;
    platform?: string;
  };

  const prompt = `You are an expert ${platform} product listing copywriter. Generate a high-converting product listing for:

Product: ${productName.trim()}
Keywords: ${keywords.trim() || "none provided"}
Platform: ${platform}

Respond ONLY with valid JSON in this exact shape (no markdown, no extra text):
{
  "title": "...",
  "bullets": ["...", "...", "...", "...", "..."],
  "description": "...",
  "tags": ["...", "...", "...", "...", "...", "...", "...", "...", "...", "..."],
  "price": "$XX.XX"
}

Rules:
- title: SEO-rich, under 200 characters, include top keywords naturally
- bullets: exactly 5 bullet points, start each with a relevant emoji and ALL-CAPS feature name
- description: 2-3 sentences, persuasive, highlight top benefits
- tags: exactly 10 backend keyword phrases (no hashtags)
- price: realistic suggested retail price`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err?.error?.message ?? "Gemini API error" }, { status: res.status });
    }

    const data = await res.json();
    const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });
    }

    const listing = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ ok: true, listing });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
