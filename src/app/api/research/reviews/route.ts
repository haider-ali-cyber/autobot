import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CACHE_TTL_MS = 15 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;

interface CacheEntry { expiresAt: number; payload: ReviewsPayload; }
interface RateLimitEntry { count: number; resetAt: number; }

const globalStore = globalThis as typeof globalThis & {
  __selloraRevCache?: Map<string, CacheEntry>;
  __selloraRevRL?: Map<string, RateLimitEntry>;
};
const revCache = globalStore.__selloraRevCache ?? new Map<string, CacheEntry>();
const revRL = globalStore.__selloraRevRL ?? new Map<string, RateLimitEntry>();
globalStore.__selloraRevCache = revCache;
globalStore.__selloraRevRL = revRL;

export interface Review {
  rating: number;
  title: string;
  text: string;
  author: string;
  date: string;
  verified: boolean;
  sentiment: "positive" | "negative" | "mixed";
  category: string;
  insight: string;
}

export interface Improvement {
  issue: string;
  frequency: number;
  priority: "High" | "Medium" | "Low";
  fix: string;
}

export interface ReviewsPayload {
  asin: string;
  productTitle: string;
  totalRatings: number;
  avgRating: number;
  reviews: Review[];
  improvements: Improvement[];
  positivePercent: number;
  negativePercent: number;
  mixedPercent: number;
  topFeatures: { feature: string; mentions: number }[];
  fetchedAt: string;
}

interface RapidReview {
  review_title?: string;
  review_comment?: string;
  review_star_rating?: string;
  review_author_name?: string;
  review_date?: string;
  is_verified_purchase?: boolean;
}

function getClientIp(req: NextRequest) {
  const ff = req.headers.get("x-forwarded-for");
  if (ff) return ff.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function checkRL(ip: string): number | null {
  const now = Date.now();
  const e = revRL.get(ip);
  if (!e || e.resetAt <= now) { revRL.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }); return null; }
  if (e.count >= RATE_LIMIT_MAX_REQUESTS) return Math.max(1, Math.ceil((e.resetAt - now) / 1000));
  e.count += 1; revRL.set(ip, e); return null;
}

function inferSentiment(rating: number): "positive" | "negative" | "mixed" {
  if (rating >= 4) return "positive";
  if (rating <= 2) return "negative";
  return "mixed";
}

function inferCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("quality") || t.includes("broke") || t.includes("cheap")) return "Build Quality";
  if (t.includes("noise") || t.includes("loud") || t.includes("quiet")) return "Noise Level";
  if (t.includes("battery") || t.includes("charge") || t.includes("power")) return "Battery Life";
  if (t.includes("heat") || t.includes("warm") || t.includes("temperature")) return "Heat Function";
  if (t.includes("fit") || t.includes("size") || t.includes("strap")) return "Fit & Comfort";
  if (t.includes("pain") || t.includes("relief") || t.includes("neck") || t.includes("effective")) return "Effectiveness";
  if (t.includes("instruction") || t.includes("setup") || t.includes("manual")) return "Instructions";
  if (t.includes("ship") || t.includes("deliver") || t.includes("packag")) return "Shipping";
  return "General";
}

function inferInsight(text: string, rating: number): string {
  const t = text.toLowerCase();
  if (t.includes("heat") && rating <= 2) return "Heat function durability — upgrade PCB heat protection";
  if (t.includes("noise") && rating <= 3) return "Motor noise complaint — consider brushless motor upgrade";
  if (t.includes("battery") && rating <= 3) return "Battery life gap — upgrade to 3000mAh cell";
  if (t.includes("broke") || t.includes("cheap")) return "Build quality issue — reinforce key components";
  if (t.includes("strap") || t.includes("fit")) return "Size inclusivity gap — add adjustable strap options";
  if (t.includes("pain") && rating >= 4) return "Pain relief is #1 selling point — highlight in listing";
  if (t.includes("gift") && rating >= 4) return "Gift purchase segment — optimize packaging & presentation";
  if (rating >= 5) return "Highly satisfied — capture testimonial for UGC content";
  return "Analyze review patterns to identify improvement areas";
}

function buildImprovements(reviews: Review[]): Improvement[] {
  const freq: Record<string, number> = {};
  for (const r of reviews) {
    if (r.sentiment !== "positive") freq[r.category] = (freq[r.category] ?? 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([issue, frequency]) => ({
      issue,
      frequency,
      priority: frequency >= 3 ? "High" : frequency >= 2 ? "Medium" : "Low",
      fix: inferFix(issue),
    }));
}

function inferFix(issue: string): string {
  const fixes: Record<string, string> = {
    "Build Quality": "Reinforce housing — switch to ABS+PC blend",
    "Noise Level": "Switch to brushless DC motor supplier",
    "Battery Life": "Upgrade to 3000mAh lithium cell",
    "Heat Function": "Improve heat circuit protection layer",
    "Fit & Comfort": "Add M/L/XL adjustable strap options",
    "Effectiveness": "Add usage guide for best results",
    "Instructions": "Include multilingual printed manual",
    "Shipping": "Switch to faster fulfillment method",
    "General": "Review customer feedback for patterns",
  };
  return fixes[issue] ?? "Investigate further";
}

function buildTopFeatures(reviews: Review[]): { feature: string; mentions: number }[] {
  const counts: Record<string, number> = {};
  const positive = reviews.filter(r => r.sentiment === "positive");
  for (const r of positive) {
    const t = (r.title + " " + r.text).toLowerCase();
    const features: Record<string, string[]> = {
      "Heat therapy": ["heat", "warm", "infrared"],
      "Portability": ["portable", "travel", "compact", "carry"],
      "Pain relief": ["pain", "relief", "neck", "shoulder"],
      "Easy to use": ["easy", "simple", "intuitive", "one-button"],
      "Battery life": ["battery", "long-lasting", "charge"],
      "Build quality": ["sturdy", "solid", "durable", "quality"],
    };
    for (const [feat, kws] of Object.entries(features)) {
      if (kws.some(k => t.includes(k))) counts[feat] = (counts[feat] ?? 0) + 1;
    }
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([feature, mentions]) => ({ feature, mentions }));
}

export async function GET(req: NextRequest) {
  const now = Date.now();
  for (const [k, v] of revCache) if (v.expiresAt <= now) revCache.delete(k);
  for (const [k, v] of revRL) if (v.resetAt <= now) revRL.delete(k);

  const ip = getClientIp(req);
  const wait = checkRL(ip);
  if (wait !== null) return NextResponse.json({ error: "Rate limit exceeded", retryAfter: wait }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const asin = (searchParams.get("asin") ?? "").trim().toUpperCase();
  if (!asin) return NextResponse.json({ error: "asin is required" }, { status: 400 });

  const cached = revCache.get(asin);
  if (cached && cached.expiresAt > now) return NextResponse.json({ ...cached.payload, fromCache: true });

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return NextResponse.json({ error: "RAPIDAPI_KEY not configured" }, { status: 503 });

  try {
    const url = `https://real-time-amazon-data.p.rapidapi.com/product-reviews?asin=${encodeURIComponent(asin)}&country=US&verified_purchases_only=false&sort_by=TOP_REVIEWS&star_rating=ALL&page=1`;
    const res = await fetch(url, {
      headers: { "x-rapidapi-key": apiKey, "x-rapidapi-host": "real-time-amazon-data.p.rapidapi.com" },
      signal: AbortSignal.timeout(14000),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return NextResponse.json({ error: `Amazon API error: ${res.status}`, detail: txt.slice(0, 200) }, { status: 502 });
    }

    const data = await res.json() as {
      data?: {
        product_title?: string;
        total_reviews?: number;
        average_rating?: number;
        reviews?: RapidReview[];
      };
    };

    const raw = data?.data;
    if (!raw) return NextResponse.json({ error: "No data returned from API" }, { status: 404 });

    const rawReviews = raw.reviews ?? [];
    const reviews: Review[] = rawReviews.map(r => {
      const rating = parseInt(r.review_star_rating ?? "3", 10) || 3;
      const text = (r.review_comment ?? "").trim();
      const title = (r.review_title ?? "").trim();
      const sentiment = inferSentiment(rating);
      const category = inferCategory(text + " " + title);
      return {
        rating,
        title: title || "Review",
        text: text || "No review text provided.",
        author: r.review_author_name ?? "Anonymous",
        date: r.review_date ?? "",
        verified: r.is_verified_purchase ?? false,
        sentiment,
        category,
        insight: inferInsight(text, rating),
      };
    });

    const positive = reviews.filter(r => r.sentiment === "positive").length;
    const negative = reviews.filter(r => r.sentiment === "negative").length;
    const mixed = reviews.filter(r => r.sentiment === "mixed").length;
    const total = reviews.length || 1;

    const payload: ReviewsPayload = {
      asin,
      productTitle: raw.product_title ?? asin,
      totalRatings: raw.total_reviews ?? 0,
      avgRating: parseFloat((raw.average_rating ?? 0).toString()) || 0,
      reviews,
      improvements: buildImprovements(reviews),
      positivePercent: Math.round((positive / total) * 100),
      negativePercent: Math.round((negative / total) * 100),
      mixedPercent: Math.round((mixed / total) * 100),
      topFeatures: buildTopFeatures(reviews),
      fetchedAt: new Date().toISOString(),
    };

    revCache.set(asin, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
    return NextResponse.json({ ...payload, fromCache: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
