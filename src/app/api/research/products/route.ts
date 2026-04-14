import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CACHE_TTL_MS = 10 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;

interface ResearchProduct {
  asin: string;
  name: string;
  price: string;
  cost: string;
  profit: string;
  margin: string;
  rating: number;
  reviews: number;
  image: string;
  url: string;
  isBestSeller: boolean;
  isAmazonChoice: boolean;
  platform: "Amazon";
  demand: number;
  competition: number;
  score: number;
  badge: string;
  trend: "up" | "down";
  category: "Amazon";
}

interface ProductCacheEntry {
  expiresAt: number;
  payload: { products: ResearchProduct[]; fetchedAt: string };
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const globalStore = globalThis as typeof globalThis & {
  __selloraProductsCache?: Map<string, ProductCacheEntry>;
  __selloraProductsRateLimit?: Map<string, RateLimitEntry>;
};

const productsCache =
  globalStore.__selloraProductsCache ?? new Map<string, ProductCacheEntry>();
const productsRateLimit =
  globalStore.__selloraProductsRateLimit ?? new Map<string, RateLimitEntry>();

globalStore.__selloraProductsCache = productsCache;
globalStore.__selloraProductsRateLimit = productsRateLimit;

interface AmazonProduct {
  asin?: string;
  product_title?: string;
  product_price?: string;
  product_minimum_offer_price?: string;
  product_star_rating?: string;
  product_num_ratings?: number;
  product_photo?: string;
  product_url?: string;
  is_best_seller?: boolean;
  is_amazon_choice?: boolean;
  sales_volume?: string;
}

function getClientIp(req: NextRequest) {
  const ff = req.headers.get("x-forwarded-for");
  if (ff) return ff.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function checkRateLimit(ip: string): number | null {
  const now = Date.now();
  const entry = productsRateLimit.get(ip);
  if (!entry || entry.resetAt <= now) {
    productsRateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  }
  entry.count += 1;
  productsRateLimit.set(ip, entry);
  return null;
}

function parsePrice(raw?: string): number {
  if (!raw) return 0;
  return parseFloat(raw.replace(/[^0-9.]/g, "")) || 0;
}

function calcScores(price: number, reviews: number, isBestSeller: boolean) {
  const demand = Math.min(100, Math.round(40 + (reviews / 200) + (isBestSeller ? 20 : 0)));
  const competition = Math.min(100, Math.round(30 + (reviews / 500)));
  const score = Math.min(100, Math.round(demand * 0.6 + (100 - competition) * 0.4));
  const badge =
    score >= 92 ? "Hot" :
    score >= 85 ? "Trending" :
    score >= 78 ? "Rising" :
    isBestSeller ? "Best Seller" : "";
  const trend: "up" | "down" = score >= 70 ? "up" : "down";
  return { demand, competition, score, badge, trend };
}

function normalizeProduct(p: AmazonProduct): ResearchProduct | null {
  if (!p.asin || !p.product_title) return null;
  const price = parsePrice(p.product_price ?? p.product_minimum_offer_price);
  if (price <= 0) return null;
  const cost = parseFloat((price * 0.28).toFixed(2));
  const fees = parseFloat((price * 0.15 + 3.5).toFixed(2));
  const profit = parseFloat((price - cost - fees).toFixed(2));
  const margin = price > 0 ? Math.round((profit / price) * 100) : 0;
  const reviews = p.product_num_ratings ?? 0;
  const isBestSeller = p.is_best_seller ?? false;
  const { demand, competition, score, badge, trend } = calcScores(price, reviews, isBestSeller);

  return {
    asin: p.asin,
    name: p.product_title,
    price: `$${price.toFixed(2)}`,
    cost: `$${cost.toFixed(2)}`,
    profit: profit > 0 ? `$${profit.toFixed(2)}` : "$0.00",
    margin: `${margin}%`,
    rating: parseFloat(p.product_star_rating ?? "0") || 0,
    reviews,
    image: p.product_photo ?? "",
    url: p.product_url ?? `https://www.amazon.com/dp/${p.asin}`,
    isBestSeller,
    isAmazonChoice: p.is_amazon_choice ?? false,
    platform: "Amazon",
    demand,
    competition,
    score,
    badge,
    trend,
    category: "Amazon",
  };
}

function cleanupStores() {
  const now = Date.now();
  for (const [k, v] of productsCache) {
    if (v.expiresAt <= now) productsCache.delete(k);
  }
  for (const [k, v] of productsRateLimit) {
    if (v.resetAt <= now) productsRateLimit.delete(k);
  }
}

export async function GET(req: NextRequest) {
  cleanupStores();

  const ip = getClientIp(req);
  const retryAfter = checkRateLimit(ip);
  if (retryAfter !== null) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") ?? "wireless earbuds").trim().slice(0, 120);

  const cacheKey = query.toLowerCase();
  const cached = productsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ ...cached.payload, fromCache: true });
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RAPIDAPI_KEY not configured" }, { status: 503 });
  }

  try {
    const url = `https://real-time-amazon-data.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&country=US&sort_by=RELEVANCE&product_condition=ALL`;
    const res = await fetch(url, {
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "real-time-amazon-data.p.rapidapi.com",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Amazon API error: ${res.status}`, detail: txt.slice(0, 200) },
        { status: 502 }
      );
    }

    const data = await res.json() as { data?: { products?: AmazonProduct[] } };
    const raw = data?.data?.products ?? [];
    const products = raw
      .map(normalizeProduct)
      .filter((p): p is ResearchProduct => p !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    const payload = { products, fetchedAt: new Date().toISOString() };
    productsCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });

    return NextResponse.json({ ...payload, fromCache: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
