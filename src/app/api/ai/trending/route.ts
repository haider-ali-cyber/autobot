import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CACHE_TTL_MS = 30 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;

interface CacheEntry { expiresAt: number; payload: TrendingPayload; }
interface RateLimitEntry { count: number; resetAt: number; }

const globalStore = globalThis as typeof globalThis & {
  __selloraTrendCache?: Map<string, CacheEntry>;
  __selloraTrendRL?: Map<string, RateLimitEntry>;
};
const trendCache = globalStore.__selloraTrendCache ?? new Map<string, CacheEntry>();
const trendRL = globalStore.__selloraTrendRL ?? new Map<string, RateLimitEntry>();
globalStore.__selloraTrendCache = trendCache;
globalStore.__selloraTrendRL = trendRL;

export interface TrendingProduct {
  name: string;
  niche: string;
  score: number;
  stage: "Early" | "Rising" | "Peak";
  daysLeft: number;
  platforms: string[];
  growth: string;
  source: string;
  whyTrending: string;
}

export type TrendDataPoint = Record<string, string | number>;

export interface TrendingPayload {
  products: TrendingProduct[];
  trendData: TrendDataPoint[];
  upcomingEvents: { event: string; date: string; days: number; products: string[] }[];
  generatedAt: string;
}

function getClientIp(req: NextRequest) {
  const ff = req.headers.get("x-forwarded-for");
  if (ff) return ff.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function checkRL(ip: string): number | null {
  const now = Date.now();
  const e = trendRL.get(ip);
  if (!e || e.resetAt <= now) { trendRL.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }); return null; }
  if (e.count >= RATE_LIMIT_MAX_REQUESTS) return Math.max(1, Math.ceil((e.resetAt - now) / 1000));
  e.count += 1; trendRL.set(ip, e); return null;
}

function buildUpcomingEvents(): { event: string; date: string; days: number; products: string[] }[] {
  const now = new Date();
  const events = [
    { event: "Mother's Day (USA)", month: 4, day: 11, products: ["Jewelry", "Skincare", "Candles"] },
    { event: "Memorial Day Sales", month: 4, day: 26, products: ["Outdoor", "BBQ", "Sports"] },
    { event: "Amazon Prime Day", month: 6, day: 15, products: ["Electronics", "Home", "Toys"] },
    { event: "Back to School", month: 7, day: 1, products: ["Stationery", "Bags", "Tech Accessories"] },
    { event: "Black Friday", month: 10, day: 28, products: ["Electronics", "Fashion", "Home Decor"] },
    { event: "Christmas Season", month: 11, day: 1, products: ["Gifts", "Decor", "Toys"] },
  ];
  return events
    .map(e => {
      const date = new Date(now.getFullYear(), e.month, e.day);
      if (date < now) date.setFullYear(date.getFullYear() + 1);
      const days = Math.ceil((date.getTime() - now.getTime()) / 86400000);
      return {
        event: e.event,
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        days,
        products: e.products,
      };
    })
    .filter(e => e.days > 0)
    .sort((a, b) => a.days - b.days)
    .slice(0, 4);
}

const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];

async function callGemini(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 2000 },
      }),
      signal: AbortSignal.timeout(20000),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }
  const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

export async function POST(req: NextRequest) {
  const now = Date.now();
  for (const [k, v] of trendCache) if (v.expiresAt <= now) trendCache.delete(k);
  for (const [k, v] of trendRL) if (v.resetAt <= now) trendRL.delete(k);

  const ip = getClientIp(req);
  const wait = checkRL(ip);
  if (wait !== null) return NextResponse.json({ error: "Rate limit exceeded", retryAfter: wait }, { status: 429 });

  const body = await req.json().catch(() => ({})) as { niche?: string; refresh?: boolean };
  const niche = (body.niche ?? "ecommerce dropshipping").trim().slice(0, 80);
  const cacheKey = niche.toLowerCase();

  if (!body.refresh) {
    const cached = trendCache.get(cacheKey);
    if (cached && cached.expiresAt > now) return NextResponse.json({ ...cached.payload, fromCache: true });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });

  const currentMonth = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

  const prompt = `You are a trending product analyst for Amazon FBA and Shopify dropshipping sellers.

Generate a JSON response with exactly 6 currently trending products for ${currentMonth} in the "${niche}" space.

Return ONLY valid JSON in this exact format:
{
  "products": [
    {
      "name": "product name",
      "niche": "niche category",
      "score": 85,
      "stage": "Rising",
      "daysLeft": 45,
      "platforms": ["TikTok", "Amazon"],
      "growth": "+180%",
      "source": "TikTok",
      "whyTrending": "one sentence reason"
    }
  ],
  "trendData": [
    { "week": "W1", "p1": 20, "p2": 40, "p3": 60 },
    { "week": "W2", "p1": 35, "p2": 55, "p3": 68 },
    { "week": "W3", "p1": 55, "p2": 62, "p3": 72 },
    { "week": "W4", "p1": 80, "p2": 70, "p3": 78 },
    { "week": "W5", "p1": 95, "p2": 78, "p3": 82 },
    { "week": "W6", "p1": 100, "p2": 88, "p3": 88 }
  ]
}

Rules:
- stage must be exactly: "Early", "Rising", or "Peak"
- score: 60-99
- daysLeft: 7-120
- growth: format like "+150%"
- platforms: array from ["TikTok", "Amazon", "Shopify", "Instagram", "Pinterest", "Reddit"]
- source: one platform where it originated
- trendData p1/p2/p3 should reflect the top 3 products' growth curves
- Return ONLY the JSON object, no markdown, no explanation`;

  let lastError = "";

  for (const modelName of MODELS) {
    try {
      const text = await callGemini(apiKey, modelName, prompt);
      if (!text) continue;
      const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      const parsed = JSON.parse(jsonMatch[0]) as { products?: TrendingProduct[]; trendData?: TrendDataPoint[] };

      const payload: TrendingPayload = {
        products: parsed.products ?? [],
        trendData: parsed.trendData ?? [],
        upcomingEvents: buildUpcomingEvents(),
        generatedAt: new Date().toISOString(),
      };

      trendCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
      return NextResponse.json({ ...payload, fromCache: false });
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return NextResponse.json({ error: lastError }, { status: 500 });
}
