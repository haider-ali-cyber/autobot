import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CACHE_TTL_MS = 20 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 15;

interface CacheEntry { expiresAt: number; payload: BrandPayload; }
interface RateLimitEntry { count: number; resetAt: number; }

const globalStore = globalThis as typeof globalThis & {
  __selloraBPCache?: Map<string, CacheEntry>;
  __selloraBPRL?: Map<string, RateLimitEntry>;
};
const bpCache = globalStore.__selloraBPCache ?? new Map<string, CacheEntry>();
const bpRL = globalStore.__selloraBPRL ?? new Map<string, RateLimitEntry>();
globalStore.__selloraBPCache = bpCache;
globalStore.__selloraBPRL = bpRL;

export interface Threat {
  type: string;
  product: string;
  seller: string;
  severity: "High" | "Medium" | "Low";
  status: "Active" | "Reported" | "Monitoring" | "Flagged";
  platform: string;
  description: string;
  action: string;
}

export interface MonitorKeyword {
  keyword: string;
  mentions: number;
  risk: "High" | "Medium" | "Low";
  platforms: string[];
  trend: "up" | "down" | "stable";
}

export interface BrandPayload {
  brandName: string;
  threats: Threat[];
  monitorKeywords: MonitorKeyword[];
  protectionTips: string[];
  threatSummary: { active: number; reported: number; monitoring: number; resolved: number };
  generatedAt: string;
}

function getClientIp(req: NextRequest) {
  const ff = req.headers.get("x-forwarded-for");
  if (ff) return ff.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function checkRL(ip: string): number | null {
  const now = Date.now();
  const e = bpRL.get(ip);
  if (!e || e.resetAt <= now) { bpRL.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }); return null; }
  if (e.count >= RATE_LIMIT_MAX_REQUESTS) return Math.max(1, Math.ceil((e.resetAt - now) / 1000));
  e.count += 1; bpRL.set(ip, e); return null;
}

const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];

export async function POST(req: NextRequest) {
  const now = Date.now();
  for (const [k, v] of bpCache) if (v.expiresAt <= now) bpCache.delete(k);
  for (const [k, v] of bpRL) if (v.resetAt <= now) bpRL.delete(k);

  const ip = getClientIp(req);
  const wait = checkRL(ip);
  if (wait !== null) return NextResponse.json({ error: "Rate limit exceeded", retryAfter: wait }, { status: 429 });

  const body = await req.json().catch(() => ({})) as { brand?: string; niche?: string };
  const brand = (body.brand ?? "").trim().slice(0, 80);
  const niche = (body.niche ?? "ecommerce").trim().slice(0, 80);
  if (!brand) return NextResponse.json({ error: "brand is required" }, { status: 400 });

  const cacheKey = brand.toLowerCase();
  const cached = bpCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return NextResponse.json({ ...cached.payload, fromCache: true });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });

  const prompt = `You are an Amazon brand protection analyst.

Simulate a brand threat scan for: "${brand}" (niche: ${niche})

Return ONLY valid JSON:
{
  "threats": [
    {
      "type": "Hijacker",
      "product": "product name",
      "seller": "seller name",
      "severity": "High",
      "status": "Active",
      "platform": "Amazon",
      "description": "one sentence describing the threat",
      "action": "recommended action"
    }
  ],
  "monitorKeywords": [
    {
      "keyword": "${brand}",
      "mentions": 42,
      "risk": "Low",
      "platforms": ["Amazon", "Google"],
      "trend": "stable"
    }
  ],
  "protectionTips": [
    "tip 1",
    "tip 2",
    "tip 3",
    "tip 4"
  ],
  "threatSummary": {
    "active": 2,
    "reported": 1,
    "monitoring": 1,
    "resolved": 5
  }
}

Rules:
- Generate 3-5 realistic threats for an e-commerce brand
- threat type from: ["Hijacker", "Counterfeit", "Price Violation", "Fake Review", "IP Infringement", "Unauthorized Reseller"]
- severity: "High", "Medium", or "Low" only
- status: "Active", "Reported", "Monitoring", or "Flagged" only
- platform: "Amazon", "Shopify", "TikTok", "eBay", or "Google"
- monitorKeywords: 4-5 keywords including brand name, brand dupes, fake brand
- risk: "High", "Medium", or "Low" only
- trend: "up", "down", or "stable" only
- protectionTips: 4 actionable Amazon brand protection tips
- Return ONLY valid JSON, no markdown`;

  let lastError = "";

  for (const modelName of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
          }),
          signal: AbortSignal.timeout(15000),
        }
      );
      if (!res.ok) { const e = await res.json().catch(() => ({})) as { error?: { message?: string } }; lastError = e?.error?.message ?? `HTTP ${res.status}`; continue; }
      const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      if (!text) continue;
      const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      const parsed = JSON.parse(jsonMatch[0]) as Partial<BrandPayload>;

      const payload: BrandPayload = {
        brandName: brand,
        threats: parsed.threats ?? [],
        monitorKeywords: parsed.monitorKeywords ?? [],
        protectionTips: parsed.protectionTips ?? [],
        threatSummary: parsed.threatSummary ?? { active: 0, reported: 0, monitoring: 0, resolved: 0 },
        generatedAt: new Date().toISOString(),
      };

      bpCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
      return NextResponse.json({ ...payload, fromCache: false });
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return NextResponse.json({ error: lastError }, { status: 500 });
}
