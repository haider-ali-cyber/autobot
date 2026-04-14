import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;

interface RateLimitEntry { count: number; resetAt: number; }

const globalStore = globalThis as typeof globalThis & {
  __selloraPhotoRL?: Map<string, RateLimitEntry>;
};
const photoRL = globalStore.__selloraPhotoRL ?? new Map<string, RateLimitEntry>();
globalStore.__selloraPhotoRL = photoRL;

export interface AdCopy {
  productName: string;
  headline: string;
  tagline: string;
  cta: string;
  features: string[];
  bgColor: string;
  textColor: string;
  accentColor: string;
  badgeText: string;
  targetAudience: string;
  platform: string;
}

function getClientIp(req: NextRequest) {
  const ff = req.headers.get("x-forwarded-for");
  if (ff) return ff.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function checkRL(ip: string): number | null {
  const now = Date.now();
  const e = photoRL.get(ip);
  if (!e || e.resetAt <= now) { photoRL.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }); return null; }
  if (e.count >= RATE_LIMIT_MAX_REQUESTS) return Math.max(1, Math.ceil((e.resetAt - now) / 1000));
  e.count += 1; photoRL.set(ip, e); return null;
}

const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];

export async function POST(req: NextRequest) {
  const now = Date.now();
  for (const [k, v] of photoRL) if (v.resetAt <= now) photoRL.delete(k);

  const ip = getClientIp(req);
  const wait = checkRL(ip);
  if (wait !== null) return NextResponse.json({ error: "Rate limit exceeded", retryAfter: wait }, { status: 429 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });

  const body = await req.json().catch(() => null) as { imageBase64?: string; mimeType?: string; template?: string } | null;
  if (!body?.imageBase64) return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });

  const mimeType = body.mimeType ?? "image/jpeg";
  const template = body.template ?? "amazon";

  const prompt = `You are a world-class e-commerce ad designer and copywriter. Analyze this product image and create a professional advertisement.

Identify the product and generate compelling ad copy. Return ONLY valid JSON:
{
  "productName": "Short product name (3-5 words max)",
  "headline": "POWERFUL headline in ALL CAPS (max 6 words)",
  "tagline": "Compelling benefit statement (max 12 words)",
  "cta": "Action button text (2-4 words, e.g. Shop Now, Get Yours)",
  "features": ["Feature 1 (max 4 words)", "Feature 2 (max 4 words)", "Feature 3 (max 4 words)"],
  "bgColor": "#1a1a2e",
  "textColor": "#ffffff",
  "accentColor": "#e94560",
  "badgeText": "Short badge like: NEW | BESTSELLER | LIMITED | SALE",
  "targetAudience": "Who this product is for (max 8 words)",
  "platform": "${template}"
}

Color guidance based on template "${template}":
- amazon: bgColor "#232f3e", textColor "#ffffff", accentColor "#ff9900"
- tiktok: bgColor "#010101", textColor "#ffffff", accentColor "#fe2c55"
- shopify: bgColor "#1a1a2e", textColor "#ffffff", accentColor "#5c6bc0"
- instagram: bgColor "#833ab4", textColor "#ffffff", accentColor "#fd1d1d"

Make the ad copy high-converting, benefit-focused, and scroll-stopping.
Return ONLY the JSON object, no markdown, no explanation.`;

  let lastError = "";

  for (const modelName of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: body.imageBase64,
                  },
                },
                { text: prompt },
              ],
            }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 600 },
          }),
          signal: AbortSignal.timeout(20000),
        }
      );

      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: { message?: string } };
        lastError = e?.error?.message ?? `HTTP ${res.status}`;
        continue;
      }

      const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      if (!text) continue;

      const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) { lastError = "No JSON in response"; continue; }

      const parsed = JSON.parse(jsonMatch[0]) as AdCopy;
      return NextResponse.json({ ok: true, ad: parsed });
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return NextResponse.json({ error: lastError }, { status: 500 });
}
