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

  const { productName, category, priceRange, targetMarket, usp, keywords } = body as {
    productName: string;
    category?: string;
    priceRange?: string;
    targetMarket?: string;
    usp?: string;
    keywords?: string;
  };

  const prompt = `You are an expert e-commerce launch strategist. Generate a complete product launch package.

Product: ${productName.trim()}
Category: ${category || "General"}
Price Range: ${priceRange || "Not specified"}
Target Market: ${targetMarket || "General consumers"}
Unique Selling Point: ${usp || "Not specified"}
Keywords: ${keywords || "None provided"}

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "amazon": {
    "title": "...",
    "bullets": ["...", "...", "...", "...", "..."],
    "description": "...",
    "backendKeywords": ["...", "...", "...", "...", "...", "...", "...", "...", "...", "..."],
    "suggestedPrice": "$XX.XX"
  },
  "shopify": {
    "title": "...",
    "description": "...",
    "tags": ["...", "...", "...", "...", "...", "...", "...", "...", "...", "..."],
    "metaTitle": "...",
    "metaDescription": "..."
  },
  "meta": {
    "primaryHook": "...",
    "primaryText": "...",
    "headline": "...",
    "cta": "...",
    "variations": [
      {"hook": "...", "text": "...", "headline": "..."},
      {"hook": "...", "text": "...", "headline": "..."}
    ]
  },
  "tiktok": {
    "hook": "...",
    "script": "...",
    "hashtags": ["...", "...", "...", "...", "...", "...", "...", "...", "...", "..."],
    "cta": "..."
  },
  "google": {
    "headlines": ["...", "...", "...", "...", "...", "...", "...", "...", "...", "...", "...", "...", "...", "...", "..."],
    "descriptions": ["...", "...", "...", "..."],
    "keywords": ["...", "...", "...", "...", "...", "...", "...", "...", "...", "..."]
  },
  "audience": {
    "ageRange": "...",
    "gender": "...",
    "interests": ["...", "...", "...", "...", "...", "...", "...", "...", "...", "..."],
    "painPoints": ["...", "...", "...", "..."],
    "buyingMotivation": "..."
  },
  "imagePrompt": "..."
}

Rules:
- Amazon title: SEO-optimized, under 200 chars
- Amazon bullets: start each with emoji + ALL-CAPS feature name, benefit-focused
- Meta primaryText: 2-3 sentences, emotion-driven, problem-solution
- TikTok hook: under 15 words, scroll-stopping
- TikTok script: 30-60 sec with [0s], [5s], [15s], [25s], [50s] timestamps
- Google headlines: max 30 chars each
- Google descriptions: max 90 chars each
- imagePrompt: detailed DALL-E prompt for a high-converting product ad image`;

  let rawText = "";
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
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
        lastError = err?.error?.message ?? "Gemini API error";
        continue;
      }
      const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (rawText) break;
    }
    if (!rawText) return NextResponse.json({ error: lastError || "All Gemini models failed" }, { status: 503 });
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
