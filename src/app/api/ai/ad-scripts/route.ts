import { NextRequest, NextResponse } from "next/server";

const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.product !== "string" || !body.product.trim()) {
    return NextResponse.json({ error: "product is required" }, { status: 400 });
  }

  const { product, format = "TikTok Hook Script" } = body as {
    product: string;
    format?: string;
  };

  const prompt = `You are an expert e-commerce ad copywriter specializing in viral social media ads.
Generate 4 high-converting ${format} scripts for the product: "${product.trim()}".

Rules:
- Each script must be under 30 words
- Use proven copywriting patterns: pain point, curiosity gap, social proof, urgency
- Make them scroll-stopping and conversational
- No markdown, no numbering, no bullet points
- Return ONLY a valid JSON array of 4 strings, nothing else

Example format: ["script 1","script 2","script 3","script 4"]`;

  let scripts: string[] = [];
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
            generationConfig: { temperature: 0.85, maxOutputTokens: 400 },
          }),
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
        lastError = err?.error?.message ?? "Gemini API error";
        continue;
      }

      const data = await res.json() as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      if (!raw) continue;

      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]) as unknown;
          if (
            Array.isArray(parsed) &&
            parsed.length > 0 &&
            parsed.every((s) => typeof s === "string")
          ) {
            scripts = (parsed as string[]).slice(0, 4);
            break;
          }
        } catch {
          lastError = "Failed to parse Gemini response";
        }
      }
    }

    if (scripts.length === 0) {
      return NextResponse.json(
        { error: lastError || "All Gemini models failed" },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true, scripts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
