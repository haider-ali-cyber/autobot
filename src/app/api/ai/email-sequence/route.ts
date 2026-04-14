import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CACHE_TTL_MS = 30 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 15;

interface CacheEntry { expiresAt: number; payload: EmailPayload; }
interface RLEntry { count: number; resetAt: number; }

const gs = globalThis as typeof globalThis & {
  __selloraEmailCache?: Map<string, CacheEntry>;
  __selloraEmailRL?: Map<string, RLEntry>;
};
const cache = gs.__selloraEmailCache ?? new Map<string, CacheEntry>();
const rl = gs.__selloraEmailRL ?? new Map<string, RLEntry>();
gs.__selloraEmailCache = cache;
gs.__selloraEmailRL = rl;

export interface Email {
  step: number;
  sendTiming: string;
  subject: string;
  preheader: string;
  body: string;
  cta: string;
  goal: string;
}

export interface EmailPayload {
  product: string;
  sequenceType: string;
  tone: string;
  emails: Email[];
  tips: string[];
  generatedAt: string;
}

function getIp(req: NextRequest) {
  const ff = req.headers.get("x-forwarded-for");
  return ff ? (ff.split(",")[0]?.trim() ?? "unknown") : (req.headers.get("x-real-ip") ?? "unknown");
}

function checkRL(ip: string) {
  const now = Date.now();
  const e = rl.get(ip);
  if (!e || e.resetAt <= now) { rl.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }); return null; }
  if (e.count >= RATE_LIMIT_MAX) return Math.max(1, Math.ceil((e.resetAt - now) / 1000));
  e.count++; rl.set(ip, e); return null;
}

const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];

const SEQUENCE_CONTEXT: Record<string, string> = {
  "Product Launch": "a new product launch sequence to build hype and drive sales",
  "Post-Purchase": "a post-purchase follow-up sequence to get reviews and repeat buyers",
  "Abandoned Cart": "an abandoned cart recovery sequence to bring back lost customers",
  "Welcome Series": "a welcome series to onboard new subscribers and introduce the brand",
  "Re-engagement": "a re-engagement sequence to win back inactive customers",
};

export async function POST(req: NextRequest) {
  const now = Date.now();
  for (const [k, v] of cache) if (v.expiresAt <= now) cache.delete(k);
  for (const [k, v] of rl) if (v.resetAt <= now) rl.delete(k);

  const ip = getIp(req);
  const wait = checkRL(ip);
  if (wait !== null) return NextResponse.json({ error: "Rate limit exceeded", retryAfter: wait }, { status: 429 });

  const body = await req.json().catch(() => ({})) as { product?: string; sequenceType?: string; tone?: string };
  const product = (body.product ?? "").trim().slice(0, 100);
  const sequenceType = (body.sequenceType ?? "Product Launch").trim();
  const tone = (body.tone ?? "Professional").trim();
  if (!product) return NextResponse.json({ error: "product is required" }, { status: 400 });

  const cacheKey = `${product.toLowerCase()}|${sequenceType}|${tone}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) return NextResponse.json({ ...cached.payload, fromCache: true });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });

  const context = SEQUENCE_CONTEXT[sequenceType] ?? "a marketing email sequence";

  const prompt = `You are an expert e-commerce email marketing copywriter.

Write ${context} for: "${product}"
Tone: ${tone}
Number of emails: 4

Return ONLY valid JSON:
{
  "emails": [
    {
      "step": 1,
      "sendTiming": "Day 0 — Immediately",
      "subject": "compelling subject line",
      "preheader": "preview text shown in inbox (max 90 chars)",
      "body": "Full email body text. 3-4 short paragraphs. Conversational. Benefit-focused. NO HTML tags.",
      "cta": "Button text (2-5 words)",
      "goal": "what this email achieves"
    }
  ],
  "tips": [
    "best practice tip 1",
    "best practice tip 2",
    "best practice tip 3"
  ]
}

Rules:
- Write exactly 4 emails in the sequence
- Each email body should be 80-150 words, conversational, benefit-led
- Subject lines should be compelling with curiosity or urgency
- sendTiming: e.g. "Day 0 — Immediately", "Day 2 — 48hrs later", "Day 5", "Day 10"
- cta: action-oriented, e.g. "Shop Now", "Claim Your Discount", "Leave a Review"
- goal: one sentence describing the email's purpose
- tips: 3 actionable email marketing tips for this type of sequence
- Return ONLY the JSON object, no markdown`;

  let lastError = "";
  for (const model of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.75, maxOutputTokens: 2500 },
          }),
          signal: AbortSignal.timeout(18000),
        }
      );
      if (!res.ok) { const e = await res.json().catch(() => ({})) as { error?: { message?: string } }; lastError = e?.error?.message ?? `HTTP ${res.status}`; continue; }
      const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      if (!text) continue;
      const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) continue;
      const parsed = JSON.parse(match[0]) as { emails?: Email[]; tips?: string[] };

      const payload: EmailPayload = {
        product,
        sequenceType,
        tone,
        emails: parsed.emails ?? [],
        tips: parsed.tips ?? [],
        generatedAt: new Date().toISOString(),
      };

      cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
      return NextResponse.json({ ...payload, fromCache: false });
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown";
    }
  }
  return NextResponse.json({ error: lastError }, { status: 500 });
}
