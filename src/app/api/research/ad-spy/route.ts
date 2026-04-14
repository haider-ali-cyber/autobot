import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CACHE_TTL_MS = 20 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 15;

interface CacheEntry {
  expiresAt: number;
  payload: { ads: SpyAd[]; fetchedAt: string };
}
interface RateLimitEntry { count: number; resetAt: number; }

const globalStore = globalThis as typeof globalThis & {
  __selloraAdSpyCache?: Map<string, CacheEntry>;
  __selloraAdSpyRL?: Map<string, RateLimitEntry>;
};
const adCache = globalStore.__selloraAdSpyCache ?? new Map<string, CacheEntry>();
const adRL = globalStore.__selloraAdSpyRL ?? new Map<string, RateLimitEntry>();
globalStore.__selloraAdSpyCache = adCache;
globalStore.__selloraAdSpyRL = adRL;

export interface SpyAd {
  id: string;
  brand: string;
  product: string;
  body: string;
  views: string;
  likes: number;
  shares: number;
  spend: string;
  days: number;
  platform: string;
  angle: string;
  score: number;
  snapshotUrl: string;
}

interface MetaAd {
  id?: string;
  page_name?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_creative_link_captions?: string[];
  impressions?: { lower_bound?: string; upper_bound?: string };
  spend?: { lower_bound?: string; upper_bound?: string };
  ad_creation_time?: string;
  publisher_platforms?: string[];
  snapshot_url?: string;
}

function getClientIp(req: NextRequest) {
  const ff = req.headers.get("x-forwarded-for");
  if (ff) return ff.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function checkRL(ip: string): number | null {
  const now = Date.now();
  const e = adRL.get(ip);
  if (!e || e.resetAt <= now) { adRL.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }); return null; }
  if (e.count >= RATE_LIMIT_MAX_REQUESTS) return Math.max(1, Math.ceil((e.resetAt - now) / 1000));
  e.count += 1; adRL.set(ip, e); return null;
}

function parseRangeAvg(obj?: { lower_bound?: string; upper_bound?: string }): number {
  if (!obj) return 0;
  const lo = parseInt(obj.lower_bound ?? "0", 10) || 0;
  const hi = parseInt(obj.upper_bound ?? "0", 10) || lo;
  return Math.round((lo + hi) / 2);
}

function getDaysRunning(createdAt?: string): number {
  if (!createdAt) return Math.round(7 + Math.random() * 30);
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.max(1, Math.round(ms / 86400000));
}

function inferPlatform(platforms?: string[]): string {
  if (!platforms || platforms.length === 0) return "Facebook";
  if (platforms.includes("tiktok")) return "TikTok";
  if (platforms.includes("instagram")) return "Instagram";
  return "Facebook";
}

function inferAngle(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("pain") || t.includes("hurt") || t.includes("relief")) return "Pain Relief Story";
  if (t.includes("before") || t.includes("after") || t.includes("transform")) return "Before/After Demo";
  if (t.includes("asmr") || t.includes("relax") || t.includes("satisf")) return "ASMR / Satisfying";
  if (t.includes("doctor") || t.includes("expert") || t.includes("recommend")) return "Expert Endorsement";
  if (t.includes("%") || t.includes("off") || t.includes("sale") || t.includes("deal")) return "Discount / Offer";
  if (t.includes("ugc") || t.includes("review") || t.includes("honest")) return "UGC / Testimonial";
  return "Problem / Solution";
}

function calcScore(impressions: number, spend: number, days: number): number {
  const cpm = spend > 0 && impressions > 0 ? (spend / impressions) * 1000 : 10;
  const longevity = Math.min(days / 60, 1) * 30;
  const scale = Math.min(Math.log10(Math.max(impressions, 1)) * 12, 50);
  const efficiency = Math.max(0, 20 - cpm);
  return Math.min(99, Math.round(scale + longevity + efficiency));
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function firstText(arr?: string[]): string {
  return arr?.find(s => s && s.trim().length > 0)?.trim() ?? "";
}

function normalizeAd(ad: MetaAd, index: number): SpyAd {
  const body = firstText(ad.ad_creative_bodies) || firstText(ad.ad_creative_link_titles) || "Ad Creative";
  const brand = ad.page_name?.trim() || "Unknown Brand";
  const impressions = parseRangeAvg(ad.impressions);
  const spend = parseRangeAvg(ad.spend);
  const likes = Math.max(0, Math.round(impressions * 0.035));
  const shares = Math.max(0, Math.round(likes * 0.12));
  const days = getDaysRunning(ad.ad_creation_time);
  const platform = inferPlatform(ad.publisher_platforms);
  const product = firstText(ad.ad_creative_link_captions) || firstText(ad.ad_creative_link_titles) || brand;
  const angle = inferAngle(`${product} ${body}`);
  const score = calcScore(impressions, spend, days);

  return {
    id: ad.id ?? `ad-${index}`,
    brand,
    product,
    body,
    views: impressions > 0 ? formatCompact(impressions) : "N/A",
    likes,
    shares,
    spend: spend > 0 ? `$${spend.toLocaleString()}` : "N/A",
    days,
    platform,
    angle,
    score: Math.max(50, score),
    snapshotUrl: ad.snapshot_url ?? "",
  };
}

export async function GET(req: NextRequest) {
  const now = Date.now();
  for (const [k, v] of adCache) if (v.expiresAt <= now) adCache.delete(k);
  for (const [k, v] of adRL) if (v.resetAt <= now) adRL.delete(k);

  const ip = getClientIp(req);
  const wait = checkRL(ip);
  if (wait !== null) return NextResponse.json({ error: "Rate limit exceeded", retryAfter: wait }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") ?? "").trim().slice(0, 120);
  const platform = (searchParams.get("platform") ?? "").toLowerCase();
  const cacheKey = `${query}|${platform}`;

  const cached = adCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return NextResponse.json({ ...cached.payload, fromCache: true });

  const token = process.env.META_ADS_LIBRARY_TOKEN;
  if (!token) return NextResponse.json({ error: "META_ADS_LIBRARY_TOKEN not configured" }, { status: 503 });

  try {
    const params = new URLSearchParams({
      access_token: token,
      ad_type: "ALL",
      ad_reached_countries: '["US"]',
      fields: "id,page_name,ad_creative_bodies,ad_creative_link_titles,ad_creative_link_captions,impressions,spend,ad_creation_time,publisher_platforms,snapshot_url",
      limit: "20",
    });
    if (query) params.set("search_terms", query);
    if (platform && platform !== "all") params.set("publisher_platforms", `["${platform}"]`);

    const url = `https://graph.facebook.com/v19.0/ads_archive?${params.toString()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return NextResponse.json({ error: `Meta API error: ${res.status}`, detail: txt.slice(0, 300) }, { status: 502 });
    }

    const data = await res.json() as { data?: MetaAd[]; error?: { message?: string } };
    if (data.error) return NextResponse.json({ error: data.error.message ?? "Meta API error" }, { status: 502 });

    const raw = data.data ?? [];
    const ads = raw
      .map((ad, i) => normalizeAd(ad, i))
      .sort((a, b) => b.score - a.score);

    const payload = { ads, fetchedAt: new Date().toISOString() };
    adCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
    return NextResponse.json({ ...payload, fromCache: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
