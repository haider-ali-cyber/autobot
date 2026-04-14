import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
const CACHE_TTL = 60 * 60 * 1000, RL_WINDOW = 60 * 1000, RL_MAX = 15;
interface CE { expiresAt: number; payload: ChecklistPayload; }
interface RE { count: number; resetAt: number; }
const gs = globalThis as typeof globalThis & { __selloraLCC?: Map<string, CE>; __selloraLCR?: Map<string, RE>; };
const lcc = gs.__selloraLCC ?? new Map<string, CE>(); gs.__selloraLCC = lcc;
const lcr = gs.__selloraLCR ?? new Map<string, RE>(); gs.__selloraLCR = lcr;
export interface ChecklistTask { task: string; category: string; priority: "Critical" | "High" | "Medium" | "Low"; timeEstimate: string; week: number; description: string; }
export interface ChecklistPayload { product: string; platform: string; totalTasks: number; estimatedLaunchWeeks: number; tasks: ChecklistTask[]; launchTips: string[]; generatedAt: string; }
function ip(req: NextRequest) { const ff = req.headers.get("x-forwarded-for"); return ff ? ff.split(",")[0]?.trim() ?? "u" : req.headers.get("x-real-ip") ?? "u"; }
function rl(i: string) { const now = Date.now(), e = lcr.get(i); if (!e || e.resetAt <= now) { lcr.set(i, { count: 1, resetAt: now + RL_WINDOW }); return null; } if (e.count >= RL_MAX) return Math.max(1, Math.ceil((e.resetAt - now) / 1000)); e.count++; lcr.set(i, e); return null; }
const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];
export async function POST(req: NextRequest) {
  const now = Date.now();
  for (const [k, v] of lcc) if (v.expiresAt <= now) lcc.delete(k);
  for (const [k, v] of lcr) if (v.resetAt <= now) lcr.delete(k);
  const wait = rl(ip(req)); if (wait !== null) return NextResponse.json({ error: "Rate limit", retryAfter: wait }, { status: 429 });
  const body = await req.json().catch(() => ({})) as { product?: string; platform?: string; stage?: string };
  const product = (body.product ?? "").trim().slice(0, 100);
  const platform = (body.platform ?? "Amazon FBA").trim();
  const stage = (body.stage ?? "Pre-Launch").trim();
  if (!product) return NextResponse.json({ error: "product required" }, { status: 400 });
  const key = `${product.toLowerCase()}|${platform}|${stage}`;
  const cached = lcc.get(key); if (cached && cached.expiresAt > now) return NextResponse.json({ ...cached.payload, fromCache: true });
  const apiKey = process.env.GEMINI_API_KEY; if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 503 });
  const prompt = `You are an Amazon FBA product launch expert. Create a complete launch checklist for:
Product: "${product}"
Platform: ${platform}
Stage: ${stage}

Generate 16-20 specific, actionable tasks organized by week. Return ONLY valid JSON:
{
  "estimatedLaunchWeeks": 6,
  "tasks": [
    {
      "task": "Task title (5-8 words)",
      "category": "Category (Research/Listing/Inventory/Marketing/Launch/Post-Launch)",
      "priority": "Critical",
      "timeEstimate": "2 hours",
      "week": 1,
      "description": "Specific instructions for this task (1-2 sentences)"
    }
  ],
  "launchTips": ["tip1", "tip2", "tip3", "tip4"]
}
Rules:
- priority: exactly "Critical", "High", "Medium", or "Low"
- week: 1-6 showing which week to do this task
- category: exactly one of: Research, Listing, Inventory, Marketing, Launch, Post-Launch
- Cover all phases: supplier, listing creation, photos, keywords, PPC setup, launch promotions, reviews
- launchTips: 4 expert tips specific to this product/platform
- Return ONLY JSON`;
  let lastErr = "";
  for (const m of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 2500 } }), signal: AbortSignal.timeout(18000) });
      if (!r.ok) { lastErr = `HTTP ${r.status}`; continue; }
      const d = await r.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const t = d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ""; if (!t) continue;
      const c = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const match = c.match(/\{[\s\S]*\}/); if (!match) continue;
      const p = JSON.parse(match[0]) as { estimatedLaunchWeeks?: number; tasks?: ChecklistTask[]; launchTips?: string[] };
      const tasks = p.tasks ?? [];
      const payload: ChecklistPayload = { product, platform, totalTasks: tasks.length, estimatedLaunchWeeks: p.estimatedLaunchWeeks ?? 6, tasks, launchTips: p.launchTips ?? [], generatedAt: new Date().toISOString() };
      lcc.set(key, { expiresAt: Date.now() + CACHE_TTL, payload });
      return NextResponse.json({ ...payload, fromCache: false });
    } catch (e) { lastErr = e instanceof Error ? e.message : "Unknown"; }
  }
  return NextResponse.json({ error: lastErr }, { status: 500 });
}
