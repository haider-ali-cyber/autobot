import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CACHE_TTL_MS = 15 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;

interface KWCacheEntry {
  expiresAt: number;
  payload: { keywords: Keyword[]; fetchedAt: string };
}
interface RateLimitEntry { count: number; resetAt: number; }

const globalStore = globalThis as typeof globalThis & {
  __selloraKWCache?: Map<string, KWCacheEntry>;
  __selloraKWRL?: Map<string, RateLimitEntry>;
};
const kwCache = globalStore.__selloraKWCache ?? new Map<string, KWCacheEntry>();
const kwRL = globalStore.__selloraKWRL ?? new Map<string, RateLimitEntry>();
globalStore.__selloraKWCache = kwCache;
globalStore.__selloraKWRL = kwRL;

const MARKETPLACE_COUNTRY: Record<string, string> = {
  US: "US", UK: "GB", DE: "DE", CA: "CA", JP: "JP", AU: "AU", IN: "IN", FR: "FR", ES: "ES", IT: "IT",
};

export interface Keyword {
  keyword: string;
  volume: number;
  cpc: string;
  competition: "Low" | "Medium" | "High";
  trend: "up" | "down";
  difficulty: number;
  platform: string;
  intent: "Transactional" | "Commercial" | "Informational";
  opportunityScore: number;
}

interface RapidKW {
  keyword?: string;
  search_volume?: number | string;
  cpc?: number | string;
  competition?: number | string;
}

function getClientIp(req: NextRequest) {
  const ff = req.headers.get("x-forwarded-for");
  if (ff) return ff.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function checkRL(ip: string): number | null {
  const now = Date.now();
  const e = kwRL.get(ip);
  if (!e || e.resetAt <= now) { kwRL.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }); return null; }
  if (e.count >= RATE_LIMIT_MAX_REQUESTS) return Math.max(1, Math.ceil((e.resetAt - now) / 1000));
  e.count += 1; kwRL.set(ip, e); return null;
}

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v.replace(/[^0-9.]/g, "")) || 0;
  return 0;
}

function compLabel(score: number): "Low" | "Medium" | "High" {
  if (score < 0.35) return "Low";
  if (score < 0.65) return "Medium";
  return "High";
}

function diffScore(vol: number, comp: number): number {
  return Math.min(100, Math.round(comp * 60 + Math.log10(Math.max(vol, 1)) * 5));
}

function detectIntent(kw: string): "Transactional" | "Commercial" | "Informational" {
  const t = kw.toLowerCase();
  if (/\b(buy|order|cheap|deal|discount|price|sale|purchase|shop|get)\b/.test(t)) return "Transactional";
  if (/\b(best|top|review|vs|compare|rated|ranking|recommend)\b/.test(t)) return "Commercial";
  return "Informational";
}

function calcOpportunity(vol: number, difficulty: number, trend: "up" | "down"): number {
  const volScore = Math.min(40, Math.round((Math.log10(Math.max(vol, 1)) / 5) * 40));
  const diffScore2 = Math.round((1 - difficulty / 100) * 40);
  const trendBonus = trend === "up" ? 20 : 0;
  return Math.min(100, volScore + diffScore2 + trendBonus);
}

function normalizeKW(k: RapidKW, index: number, marketplace = "US"): Keyword {
  const vol = toNum(k.search_volume);
  const cpc = toNum(k.cpc);
  const comp = toNum(k.competition);
  const difficulty = diffScore(vol, comp);
  const trend: "up" | "down" = difficulty < 55 ? "up" : "down";
  const intent = detectIntent(k.keyword ?? "");
  const opportunityScore = calcOpportunity(vol, difficulty, trend);
  return {
    keyword: k.keyword ?? `keyword-${index}`,
    volume: Math.round(vol),
    cpc: `$${cpc.toFixed(2)}`,
    competition: compLabel(comp),
    trend,
    difficulty,
    platform: `Amazon ${marketplace}`,
    intent,
    opportunityScore,
  };
}

export async function GET(req: NextRequest) {
  const now = Date.now();
  for (const [k, v] of kwCache) if (v.expiresAt <= now) kwCache.delete(k);
  for (const [k, v] of kwRL) if (v.resetAt <= now) kwRL.delete(k);

  const ip = getClientIp(req);
  const wait = checkRL(ip);
  if (wait !== null) return NextResponse.json({ error: "Rate limit exceeded", retryAfter: wait }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") ?? "wireless earbuds").trim().slice(0, 120);
  const marketplace = (searchParams.get("marketplace") ?? "US").toUpperCase();
  const countryCode = MARKETPLACE_COUNTRY[marketplace] ?? "US";
  const cacheKey = `${query.toLowerCase()}|${marketplace}`;
  const cached = kwCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return NextResponse.json({ ...cached.payload, fromCache: true });

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return NextResponse.json({ error: "RAPIDAPI_KEY not configured" }, { status: 503 });

  try {
    const url = `https://real-time-amazon-data.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&country=${countryCode}&sort_by=RELEVANCE&product_condition=ALL`;
    const res = await fetch(url, {
      headers: { "x-rapidapi-key": apiKey, "x-rapidapi-host": "real-time-amazon-data.p.rapidapi.com" },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return NextResponse.json({ error: `Amazon API error: ${res.status}`, detail: txt.slice(0, 200) }, { status: 502 });
    }

    const data = await res.json() as { data?: { products?: { product_title?: string; product_num_ratings?: number; product_price?: string }[] } };
    const products = data?.data?.products ?? [];

    const baseKeywords: Keyword[] = products.slice(0, 8).map((p, i) => {
      const title = p.product_title ?? query;
      const words = title.toLowerCase().split(/\s+/).slice(0, 4).join(" ");
      const vol = Math.round(10000 + (p.product_num_ratings ?? 0) * 2.5);
      const cpcRaw = parseFloat((p.product_price ?? "").replace(/[^0-9.]/g, "")) * 0.04 || 0.8;
      const diff = Math.min(100, Math.round(20 + i * 6 + Math.log10(Math.max(vol, 1)) * 4));
      const trend: "up" | "down" = diff < 55 ? "up" : "down";
      const intent = detectIntent(words);
      const opportunityScore = calcOpportunity(vol, diff, trend);
      return {
        keyword: words,
        volume: vol,
        cpc: `$${cpcRaw.toFixed(2)}`,
        competition: compLabel(diff / 100),
        trend,
        difficulty: diff,
        platform: `Amazon ${marketplace}`,
        intent,
        opportunityScore,
      };
    });

    const seen = new Set<string>();
    const keywords = baseKeywords.filter(k => {
      if (seen.has(k.keyword)) return false;
      seen.add(k.keyword);
      return true;
    }).sort((a, b) => b.volume - a.volume);

    const payload = { keywords, fetchedAt: new Date().toISOString() };
    kwCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
    return NextResponse.json({ ...payload, fromCache: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
