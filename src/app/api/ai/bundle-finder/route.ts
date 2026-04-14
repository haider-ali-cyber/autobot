import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
const CACHE_TTL = 30 * 60 * 1000, RL_WINDOW = 60 * 1000, RL_MAX = 15;
interface CE { expiresAt: number; payload: BundlePayload; }
interface RE { count: number; resetAt: number; }
const gs = globalThis as typeof globalThis & { __selloraBC?: Map<string, CE>; __selloraBR?: Map<string, RE>; };
const bc = gs.__selloraBC ?? new Map<string, CE>(); gs.__selloraBC = bc;
const br = gs.__selloraBR ?? new Map<string, RE>(); gs.__selloraBR = br;
export interface BundleIdea { name: string; products: string[]; price: string; costEstimate: string; profitMargin: string; whyItWorks: string; salesLiftEstimate: string; targetCustomer: string; platform: string; difficulty: "Easy" | "Medium" | "Hard"; }
export interface BundlePayload { bundles: BundleIdea[]; topBundle: string; insights: string[]; generatedAt: string; }
function ip(req: NextRequest) { const ff = req.headers.get("x-forwarded-for"); return ff ? ff.split(",")[0]?.trim() ?? "u" : req.headers.get("x-real-ip") ?? "u"; }
function rl(i: string) { const now = Date.now(), e = br.get(i); if (!e || e.resetAt <= now) { br.set(i, { count: 1, resetAt: now + RL_WINDOW }); return null; } if (e.count >= RL_MAX) return Math.max(1, Math.ceil((e.resetAt - now) / 1000)); e.count++; br.set(i, e); return null; }
const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];
export async function POST(req: NextRequest) {
  const now = Date.now();
  for (const [k, v] of bc) if (v.expiresAt <= now) bc.delete(k);
  for (const [k, v] of br) if (v.resetAt <= now) br.delete(k);
  const wait = rl(ip(req)); if (wait !== null) return NextResponse.json({ error: "Rate limit", retryAfter: wait }, { status: 429 });
  const body = await req.json().catch(() => ({})) as { products?: string[]; niche?: string; budget?: string };
  const products = (body.products ?? []).map((p: string) => p.trim()).filter(Boolean).slice(0, 8);
  const niche = (body.niche ?? "Amazon FBA").trim();
  const budget = (body.budget ?? "50").trim();
  if (products.length < 1) return NextResponse.json({ error: "At least 1 product required" }, { status: 400 });
  const key = products.join("|").toLowerCase() + niche;
  const cached = bc.get(key); if (cached && cached.expiresAt > now) return NextResponse.json({ ...cached.payload, fromCache: true });
  const apiKey = process.env.GEMINI_API_KEY; if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 503 });
  const prompt = `You are an Amazon FBA bundle strategy expert. Create profitable product bundle ideas.
Products available: ${products.join(", ")}
Niche/Market: ${niche}
Max bundle price: $${budget}
Generate 4 unique bundle ideas using combinations of these products (can add 1-2 complementary products).
Return ONLY valid JSON:
{
  "bundles": [
    {
      "name": "Bundle Display Name",
      "products": ["product1", "product2"],
      "price": "$49.99",
      "costEstimate": "$18.00",
      "profitMargin": "64%",
      "whyItWorks": "one sentence reason this bundle converts well",
      "salesLiftEstimate": "+35% vs selling separately",
      "targetCustomer": "who buys this (10 words max)",
      "platform": "Amazon FBA",
      "difficulty": "Easy"
    }
  ],
  "topBundle": "Name of the best bundle to launch first",
  "insights": ["tip 1", "tip 2", "tip 3"]
}
difficulty must be "Easy", "Medium", or "Hard". Return ONLY JSON.`;
  let err = "";
  for (const m of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 1800 } }), signal: AbortSignal.timeout(18000) });
      if (!r.ok) { err = `HTTP ${r.status}`; continue; }
      const d = await r.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const t = d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      if (!t) continue;
      const c = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const m2 = c.match(/\{[\s\S]*\}/); if (!m2) continue;
      const p = JSON.parse(m2[0]) as Partial<BundlePayload>;
      const payload: BundlePayload = { bundles: p.bundles ?? [], topBundle: p.topBundle ?? "", insights: p.insights ?? [], generatedAt: new Date().toISOString() };
      bc.set(key, { expiresAt: Date.now() + CACHE_TTL, payload });
      return NextResponse.json({ ...payload, fromCache: false });
    } catch (e) { err = e instanceof Error ? e.message : "Unknown"; }
  }
  return NextResponse.json({ error: err }, { status: 500 });
}
