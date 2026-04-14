import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CACHE_TTL_MS = 20 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 15;

interface CacheEntry { expiresAt: number; payload: PPCPayload; }
interface RLEntry { count: number; resetAt: number; }

const gs = globalThis as typeof globalThis & {
  __selloraPPCCache?: Map<string, CacheEntry>;
  __selloraPPCRL?: Map<string, RLEntry>;
};
const cache = gs.__selloraPPCCache ?? new Map<string, CacheEntry>();
const rl = gs.__selloraPPCRL ?? new Map<string, RLEntry>();
gs.__selloraPPCCache = cache;
gs.__selloraPPCRL = rl;

export interface PPCKeyword {
  keyword: string;
  matchType: "Exact" | "Phrase" | "Broad";
  suggestedBid: string;
  searchVolume: string;
  competition: "High" | "Medium" | "Low";
  relevance: number;
}

export interface AdGroup {
  name: string;
  theme: string;
  keywords: PPCKeyword[];
  suggestedBid: string;
}

export interface PPCPayload {
  product: string;
  market: string;
  budgetPerDay: string;
  campaignName: string;
  campaignType: string;
  targetAcos: string;
  estimatedClicks: string;
  estimatedImpressions: string;
  adGroups: AdGroup[];
  negativeKeywords: string[];
  strategy: string[];
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

export async function POST(req: NextRequest) {
  const now = Date.now();
  for (const [k, v] of cache) if (v.expiresAt <= now) cache.delete(k);
  for (const [k, v] of rl) if (v.resetAt <= now) rl.delete(k);

  const ip = getIp(req);
  const wait = checkRL(ip);
  if (wait !== null) return NextResponse.json({ error: "Rate limit exceeded", retryAfter: wait }, { status: 429 });

  const body = await req.json().catch(() => ({})) as { product?: string; market?: string; budget?: string; campaignType?: string };
  const product = (body.product ?? "").trim().slice(0, 100);
  const market = (body.market ?? "Amazon USA").trim();
  const budget = (body.budget ?? "20").trim();
  const campaignType = (body.campaignType ?? "Sponsored Products").trim();
  if (!product) return NextResponse.json({ error: "product is required" }, { status: 400 });

  const cacheKey = `${product.toLowerCase()}|${market}|${budget}|${campaignType}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) return NextResponse.json({ ...cached.payload, fromCache: true });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });

  const prompt = `You are an expert Amazon PPC advertising strategist.

Create a complete Amazon PPC campaign structure for: "${product}"
Market: ${market}
Daily Budget: $${budget}
Campaign Type: ${campaignType}

Return ONLY valid JSON in this exact structure:
{
  "campaignName": "campaign name string",
  "campaignType": "${campaignType}",
  "targetAcos": "25%",
  "estimatedClicks": "45-80/day",
  "estimatedImpressions": "2,000-4,500/day",
  "adGroups": [
    {
      "name": "Ad Group Name",
      "theme": "keyword theme description",
      "suggestedBid": "$0.85",
      "keywords": [
        {
          "keyword": "exact keyword phrase",
          "matchType": "Exact",
          "suggestedBid": "$0.90",
          "searchVolume": "8,200/mo",
          "competition": "Medium",
          "relevance": 95
        }
      ]
    }
  ],
  "negativeKeywords": ["free", "diy", "used", "broken"],
  "strategy": [
    "strategic tip 1",
    "strategic tip 2",
    "strategic tip 3"
  ]
}

Rules:
- Create 3 ad groups with different themes (exact match, phrase match, broad/competitor)
- Each ad group should have 4-6 keywords
- matchType MUST be exactly "Exact", "Phrase", or "Broad"
- competition MUST be exactly "High", "Medium", or "Low"
- relevance: number 1-100
- suggestedBid: realistic Amazon CPC bids (e.g. "$0.75")
- searchVolume: e.g. "12,400/mo"
- negativeKeywords: 6-10 irrelevant terms to exclude
- strategy: 3-4 expert PPC tips specific to this product
- targetAcos: realistic target ACoS percentage
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
            generationConfig: { temperature: 0.4, maxOutputTokens: 2000 },
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
      const parsed = JSON.parse(match[0]) as Partial<PPCPayload>;

      const payload: PPCPayload = {
        product,
        market,
        budgetPerDay: `$${budget}`,
        campaignName: parsed.campaignName ?? `${product} — ${campaignType}`,
        campaignType: parsed.campaignType ?? campaignType,
        targetAcos: parsed.targetAcos ?? "25%",
        estimatedClicks: parsed.estimatedClicks ?? "—",
        estimatedImpressions: parsed.estimatedImpressions ?? "—",
        adGroups: parsed.adGroups ?? [],
        negativeKeywords: parsed.negativeKeywords ?? [],
        strategy: parsed.strategy ?? [],
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
