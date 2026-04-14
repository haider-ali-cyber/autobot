import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
const CACHE_TTL = 25 * 60 * 1000, RL_WINDOW = 60 * 1000, RL_MAX = 15;
interface CE { expiresAt: number; payload: PricePayload; }
interface RE { count: number; resetAt: number; }
const gs = globalThis as typeof globalThis & { __selloraPTC?: Map<string, CE>; __selloraPTR?: Map<string, RE>; };
const ptc = gs.__selloraPTC ?? new Map<string, CE>(); gs.__selloraPTC = ptc;
const ptr = gs.__selloraPTR ?? new Map<string, RE>(); gs.__selloraPTR = ptr;
export interface PricePoint { month: string; yourPrice: number; competitorAvg: number; buyBoxPrice: number; }
export interface PriceInsight { strategy: string; currentPrice: string; recommendedPrice: string; potentialRevenueChange: string; reason: string; urgency: "High" | "Medium" | "Low"; }
export interface PricePayload { product: string; currentPrice: string; category: string; priceHistory: PricePoint[]; competitors: { name: string; price: string; rating: number; reviews: number; strategy: string }[]; insights: PriceInsight[]; optimalPriceRange: string; buyBoxTip: string; generatedAt: string; }
function ip(req: NextRequest) { const ff = req.headers.get("x-forwarded-for"); return ff ? ff.split(",")[0]?.trim() ?? "u" : req.headers.get("x-real-ip") ?? "u"; }
function rl(i: string) { const now = Date.now(), e = ptr.get(i); if (!e || e.resetAt <= now) { ptr.set(i, { count: 1, resetAt: now + RL_WINDOW }); return null; } if (e.count >= RL_MAX) return Math.max(1, Math.ceil((e.resetAt - now) / 1000)); e.count++; ptr.set(i, e); return null; }
const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];
export async function POST(req: NextRequest) {
  const now = Date.now();
  for (const [k, v] of ptc) if (v.expiresAt <= now) ptc.delete(k);
  for (const [k, v] of ptr) if (v.resetAt <= now) ptr.delete(k);
  const wait = rl(ip(req)); if (wait !== null) return NextResponse.json({ error: "Rate limit", retryAfter: wait }, { status: 429 });
  const body = await req.json().catch(() => ({})) as { product?: string; currentPrice?: string; category?: string };
  const product = (body.product ?? "").trim().slice(0, 100);
  const currentPrice = (body.currentPrice ?? "29.99").trim();
  const category = (body.category ?? "General").trim();
  if (!product) return NextResponse.json({ error: "product required" }, { status: 400 });
  const key = `${product.toLowerCase()}|${currentPrice}|${category}`;
  const cached = ptc.get(key); if (cached && cached.expiresAt > now) return NextResponse.json({ ...cached.payload, fromCache: true });
  const apiKey = process.env.GEMINI_API_KEY; if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 503 });
  const prompt = `You are an Amazon pricing strategy expert. Analyze pricing for: "${product}" (${category})
Current price: $${currentPrice}
Generate a realistic pricing analysis. Return ONLY valid JSON:
{
  "priceHistory": [
    { "month": "Nov", "yourPrice": 29.99, "competitorAvg": 32.50, "buyBoxPrice": 28.99 },
    { "month": "Dec", "yourPrice": 27.99, "competitorAvg": 31.00, "buyBoxPrice": 26.99 },
    { "month": "Jan", "yourPrice": 29.99, "competitorAvg": 30.50, "buyBoxPrice": 29.50 },
    { "month": "Feb", "yourPrice": 29.99, "competitorAvg": 29.99, "buyBoxPrice": 28.99 },
    { "month": "Mar", "yourPrice": 29.99, "competitorAvg": 31.00, "buyBoxPrice": 29.99 },
    { "month": "Apr", "yourPrice": 29.99, "competitorAvg": 30.50, "buyBoxPrice": 28.50 }
  ],
  "competitors": [
    { "name": "CompetitorBrand A", "price": "$27.99", "rating": 4.2, "reviews": 1240, "strategy": "Low-price leader" },
    { "name": "CompetitorBrand B", "price": "$34.99", "rating": 4.7, "reviews": 890, "strategy": "Premium positioning" },
    { "name": "CompetitorBrand C", "price": "$29.99", "rating": 4.4, "reviews": 2100, "strategy": "Mid-market" }
  ],
  "insights": [
    { "strategy": "Strategy name", "currentPrice": "$${currentPrice}", "recommendedPrice": "$XX.XX", "potentialRevenueChange": "+15%", "reason": "explanation", "urgency": "High" }
  ],
  "optimalPriceRange": "$XX.XX – $XX.XX",
  "buyBoxTip": "one specific tip to win the Buy Box for this product"
}
Rules: priceHistory has 6 months ending with current month. 3 competitors. 3 pricing insights. urgency: "High"/"Medium"/"Low". Return ONLY JSON.`;
  let lastErr = "";
  for (const m of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 1800 } }), signal: AbortSignal.timeout(18000) });
      if (!r.ok) { lastErr = `HTTP ${r.status}`; continue; }
      const d = await r.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const t = d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ""; if (!t) continue;
      const c = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const match = c.match(/\{[\s\S]*\}/); if (!match) continue;
      const p = JSON.parse(match[0]) as Partial<PricePayload>;
      const payload: PricePayload = { product, currentPrice: `$${currentPrice}`, category, priceHistory: p.priceHistory ?? [], competitors: p.competitors ?? [], insights: p.insights ?? [], optimalPriceRange: p.optimalPriceRange ?? "—", buyBoxTip: p.buyBoxTip ?? "", generatedAt: new Date().toISOString() };
      ptc.set(key, { expiresAt: Date.now() + CACHE_TTL, payload });
      return NextResponse.json({ ...payload, fromCache: false });
    } catch (e) { lastErr = e instanceof Error ? e.message : "Unknown"; }
  }
  return NextResponse.json({ error: lastErr }, { status: 500 });
}
