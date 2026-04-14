import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
const CACHE_TTL = 60 * 60 * 1000, RL_WINDOW = 60 * 1000, RL_MAX = 15;
interface CE { expiresAt: number; payload: RiskPayload; }
interface RE { count: number; resetAt: number; }
const gs = globalThis as typeof globalThis & { __selloraPRC?: Map<string, CE>; __selloraPRR?: Map<string, RE>; };
const prc = gs.__selloraPRC ?? new Map<string, CE>(); gs.__selloraPRC = prc;
const prr = gs.__selloraPRR ?? new Map<string, RE>(); gs.__selloraPRR = prr;
export interface RiskFactor { name: string; score: number; level: "Low" | "Medium" | "High" | "Critical"; explanation: string; mitigation: string; }
export interface RiskPayload { product: string; verdict: "Go" | "Caution" | "No-Go"; verdictReason: string; overallRisk: number; riskFactors: RiskFactor[]; opportunities: string[]; threats: string[]; recommendation: string; estimatedProfitPotential: string; timeToProfit: string; generatedAt: string; }
function ip(req: NextRequest) { const ff = req.headers.get("x-forwarded-for"); return ff ? ff.split(",")[0]?.trim() ?? "u" : req.headers.get("x-real-ip") ?? "u"; }
function rl(i: string) { const now = Date.now(), e = prr.get(i); if (!e || e.resetAt <= now) { prr.set(i, { count: 1, resetAt: now + RL_WINDOW }); return null; } if (e.count >= RL_MAX) return Math.max(1, Math.ceil((e.resetAt - now) / 1000)); e.count++; prr.set(i, e); return null; }
const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];
export async function POST(req: NextRequest) {
  const now = Date.now();
  for (const [k, v] of prc) if (v.expiresAt <= now) prc.delete(k);
  for (const [k, v] of prr) if (v.resetAt <= now) prr.delete(k);
  const wait = rl(ip(req)); if (wait !== null) return NextResponse.json({ error: "Rate limit", retryAfter: wait }, { status: 429 });
  const body = await req.json().catch(() => ({})) as { product?: string; price?: string; category?: string; platform?: string };
  const product = (body.product ?? "").trim().slice(0, 120);
  const price = (body.price ?? "").trim();
  const category = (body.category ?? "General").trim();
  const platform = (body.platform ?? "Amazon FBA").trim();
  if (!product) return NextResponse.json({ error: "product required" }, { status: 400 });
  const key = `risk:${product.toLowerCase()}|${platform}`;
  const cached = prc.get(key); if (cached && cached.expiresAt > now) return NextResponse.json({ ...cached.payload, fromCache: true });
  const apiKey = process.env.GEMINI_API_KEY; if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 503 });
  const prompt = `You are an Amazon FBA product risk assessment expert. Evaluate the launch risk for:
Product: "${product}"
Category: ${category}
Platform: ${platform}
Selling Price: ${price ? "$" + price : "not specified"}

Analyze 5 key risk dimensions. Return ONLY valid JSON:
{
  "verdict": "Go",
  "verdictReason": "One clear sentence explaining the go/caution/no-go verdict",
  "overallRisk": 35,
  "riskFactors": [
    {
      "name": "Competition Level",
      "score": 40,
      "level": "Medium",
      "explanation": "Specific analysis of competition for this product (2 sentences)",
      "mitigation": "Specific action to reduce this risk"
    },
    {
      "name": "Demand Stability",
      "score": 20,
      "level": "Low",
      "explanation": "Is demand consistent or seasonal? Specific analysis",
      "mitigation": "How to protect against demand fluctuations"
    },
    {
      "name": "Profit Margin Risk",
      "score": 30,
      "level": "Low",
      "explanation": "Analysis of margin sustainability given Amazon fees, COGS, and PPC costs",
      "mitigation": "How to protect margins"
    },
    {
      "name": "Supplier Dependency",
      "score": 50,
      "level": "Medium",
      "explanation": "Risk of supply chain disruption for this product category",
      "mitigation": "How to reduce supplier risk"
    },
    {
      "name": "Trend Longevity",
      "score": 25,
      "level": "Low",
      "explanation": "Is this a lasting product or a trend? Evidence and reasoning",
      "mitigation": "How to future-proof the product"
    }
  ],
  "opportunities": ["Specific opportunity 1", "Specific opportunity 2", "Specific opportunity 3"],
  "threats": ["Specific threat 1", "Specific threat 2", "Specific threat 3"],
  "recommendation": "2-3 sentence overall strategic recommendation for launching this product",
  "estimatedProfitPotential": "e.g. $3,000–$8,000/month at scale",
  "timeToProfit": "e.g. 3–5 months after launch"
}
Rules:
- verdict: "Go" (overallRisk < 40), "Caution" (40-65), "No-Go" (>65)
- overallRisk: 0-100 (average of all factor scores, weighted)
- risk level: "Low" (<30), "Medium" (30-60), "High" (61-80), "Critical" (>80)
- Be realistic and specific to the actual product
- Return ONLY JSON`;
  let lastErr = "";
  for (const m of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 2000 } }), signal: AbortSignal.timeout(18000) });
      if (!r.ok) { lastErr = `HTTP ${r.status}`; continue; }
      const d = await r.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const t = d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ""; if (!t) continue;
      const c = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const match = c.match(/\{[\s\S]*\}/); if (!match) continue;
      const p = JSON.parse(match[0]) as Partial<RiskPayload>;
      const risk = Math.min(100, Math.max(0, p.overallRisk ?? 50));
      const verdict = risk < 40 ? "Go" : risk <= 65 ? "Caution" : "No-Go";
      const payload: RiskPayload = { product, verdict, verdictReason: p.verdictReason ?? "", overallRisk: risk, riskFactors: p.riskFactors ?? [], opportunities: p.opportunities ?? [], threats: p.threats ?? [], recommendation: p.recommendation ?? "", estimatedProfitPotential: p.estimatedProfitPotential ?? "", timeToProfit: p.timeToProfit ?? "", generatedAt: new Date().toISOString() };
      prc.set(key, { expiresAt: Date.now() + CACHE_TTL, payload });
      return NextResponse.json({ ...payload, fromCache: false });
    } catch (e) { lastErr = e instanceof Error ? e.message : "Unknown"; }
  }
  return NextResponse.json({ error: lastErr }, { status: 500 });
}
