import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
const CACHE_TTL = 45 * 60 * 1000, RL_WINDOW = 60 * 1000, RL_MAX = 12;
interface CE { expiresAt: number; payload: APlusPayload; }
interface RE { count: number; resetAt: number; }
const gs = globalThis as typeof globalThis & { __selloraAPC?: Map<string, CE>; __selloraAPR?: Map<string, RE>; };
const apc = gs.__selloraAPC ?? new Map<string, CE>(); gs.__selloraAPC = apc;
const apr = gs.__selloraAPR ?? new Map<string, RE>(); gs.__selloraAPR = apr;
export interface APlusModule { type: string; headline: string; body: string; bulletPoints?: string[]; }
export interface APlusPayload { product: string; brand: string; modules: APlusModule[]; comparisonChart: { feature: string; yourProduct: string; generic: string }[]; brandStory: string; keyBenefits: string[]; generatedAt: string; }
function ip(req: NextRequest) { const ff = req.headers.get("x-forwarded-for"); return ff ? ff.split(",")[0]?.trim() ?? "u" : req.headers.get("x-real-ip") ?? "u"; }
function rl(i: string) { const now = Date.now(), e = apr.get(i); if (!e || e.resetAt <= now) { apr.set(i, { count: 1, resetAt: now + RL_WINDOW }); return null; } if (e.count >= RL_MAX) return Math.max(1, Math.ceil((e.resetAt - now) / 1000)); e.count++; apr.set(i, e); return null; }
const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];
export async function POST(req: NextRequest) {
  const now = Date.now();
  for (const [k, v] of apc) if (v.expiresAt <= now) apc.delete(k);
  for (const [k, v] of apr) if (v.resetAt <= now) apr.delete(k);
  const wait = rl(ip(req)); if (wait !== null) return NextResponse.json({ error: "Rate limit", retryAfter: wait }, { status: 429 });
  const body = await req.json().catch(() => ({})) as { product?: string; brand?: string; keywords?: string; category?: string };
  const product = (body.product ?? "").trim().slice(0, 120);
  const brand = (body.brand ?? "My Brand").trim().slice(0, 60);
  const keywords = (body.keywords ?? "").trim().slice(0, 200);
  const category = (body.category ?? "General").trim();
  if (!product) return NextResponse.json({ error: "product required" }, { status: 400 });
  const key = `${product.toLowerCase()}|${brand.toLowerCase()}`;
  const cached = apc.get(key); if (cached && cached.expiresAt > now) return NextResponse.json({ ...cached.payload, fromCache: true });
  const apiKey = process.env.GEMINI_API_KEY; if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 503 });
  const prompt = `You are an Amazon A+ Content (Enhanced Brand Content) expert. Create premium A+ content for:
Product: "${product}"
Brand: "${brand}"
Category: ${category}
Keywords: ${keywords || "not specified"}

Generate conversion-optimized A+ content. Return ONLY valid JSON:
{
  "modules": [
    {
      "type": "Hero",
      "headline": "Powerful 6-8 word benefit headline",
      "body": "2-3 sentences of compelling product story and main benefit",
      "bulletPoints": ["Benefit 1 with emoji", "Benefit 2 with emoji", "Benefit 3 with emoji"]
    },
    {
      "type": "Feature Spotlight 1",
      "headline": "Feature name headline",
      "body": "Deep explanation of this feature and why it matters to the customer (2-3 sentences)"
    },
    {
      "type": "Feature Spotlight 2",
      "headline": "Second key feature headline",
      "body": "Deep explanation of second key feature and its benefit (2-3 sentences)"
    },
    {
      "type": "Lifestyle & Use Cases",
      "headline": "Who It's Perfect For",
      "body": "3-4 sentences describing the ideal customer and usage scenarios",
      "bulletPoints": ["Use case 1", "Use case 2", "Use case 3", "Use case 4"]
    },
    {
      "type": "Quality & Trust",
      "headline": "Built to Last — Our Quality Promise",
      "body": "2-3 sentences about quality, warranty, customer satisfaction guarantee"
    }
  ],
  "comparisonChart": [
    { "feature": "Feature name", "yourProduct": "Your advantage (emoji + text)", "generic": "What generic brands lack" },
    { "feature": "Feature 2", "yourProduct": "Your advantage", "generic": "Generic limitation" },
    { "feature": "Material Quality", "yourProduct": "Premium grade materials", "generic": "Cheap alternatives" },
    { "feature": "Customer Support", "yourProduct": "24/7 dedicated support", "generic": "Limited support" },
    { "feature": "Warranty", "yourProduct": "12-month guarantee", "generic": "No guarantee" }
  ],
  "brandStory": "A compelling 3-4 sentence brand story that connects emotionally with customers and explains why this brand exists",
  "keyBenefits": ["Top benefit 1", "Top benefit 2", "Top benefit 3", "Top benefit 4", "Top benefit 5"]
}
Rules: Make content specific to the product. Use emotional language. Focus on benefits over features. Return ONLY JSON.`;
  let lastErr = "";
  for (const m of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.6, maxOutputTokens: 2500 } }), signal: AbortSignal.timeout(20000) });
      if (!r.ok) { lastErr = `HTTP ${r.status}`; continue; }
      const d = await r.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const t = d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ""; if (!t) continue;
      const c = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const match = c.match(/\{[\s\S]*\}/); if (!match) continue;
      const p = JSON.parse(match[0]) as Partial<APlusPayload>;
      const payload: APlusPayload = { product, brand, modules: p.modules ?? [], comparisonChart: p.comparisonChart ?? [], brandStory: p.brandStory ?? "", keyBenefits: p.keyBenefits ?? [], generatedAt: new Date().toISOString() };
      apc.set(key, { expiresAt: Date.now() + CACHE_TTL, payload });
      return NextResponse.json({ ...payload, fromCache: false });
    } catch (e) { lastErr = e instanceof Error ? e.message : "Unknown"; }
  }
  return NextResponse.json({ error: lastErr }, { status: 500 });
}
