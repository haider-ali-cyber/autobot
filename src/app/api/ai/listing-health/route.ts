import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
const CACHE_TTL = 30 * 60 * 1000, RL_WINDOW = 60 * 1000, RL_MAX = 15;
interface CE { expiresAt: number; payload: HealthPayload; }
interface RE { count: number; resetAt: number; }
const gs = globalThis as typeof globalThis & { __selloraLHC?: Map<string, CE>; __selloraLHR?: Map<string, RE>; };
const lhc = gs.__selloraLHC ?? new Map<string, CE>(); gs.__selloraLHC = lhc;
const lhr = gs.__selloraLHR ?? new Map<string, RE>(); gs.__selloraLHR = lhr;
export interface HealthIssue { section: string; severity: "Critical" | "Warning" | "Suggestion"; current: string; fix: string; impact: string; }
export interface HealthPayload { product: string; overallScore: number; grade: "A" | "B" | "C" | "D" | "F"; scores: { title: number; bullets: number; keywords: number; description: number; images: number; price: number }; issues: HealthIssue[]; strengths: string[]; topPriority: string; estimatedRankBoost: string; generatedAt: string; }
function ip(req: NextRequest) { const ff = req.headers.get("x-forwarded-for"); return ff ? ff.split(",")[0]?.trim() ?? "u" : req.headers.get("x-real-ip") ?? "u"; }
function rl(i: string) { const now = Date.now(), e = lhr.get(i); if (!e || e.resetAt <= now) { lhr.set(i, { count: 1, resetAt: now + RL_WINDOW }); return null; } if (e.count >= RL_MAX) return Math.max(1, Math.ceil((e.resetAt - now) / 1000)); e.count++; lhr.set(i, e); return null; }
const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];
export async function POST(req: NextRequest) {
  const now = Date.now();
  for (const [k, v] of lhc) if (v.expiresAt <= now) lhc.delete(k);
  for (const [k, v] of lhr) if (v.resetAt <= now) lhr.delete(k);
  const wait = rl(ip(req)); if (wait !== null) return NextResponse.json({ error: "Rate limit", retryAfter: wait }, { status: 429 });
  const body = await req.json().catch(() => ({})) as { product?: string; title?: string; bullets?: string[]; description?: string; keywords?: string; price?: string; imageCount?: number };
  const product = (body.product ?? body.title ?? "").trim().slice(0, 120);
  if (!product) return NextResponse.json({ error: "product required" }, { status: 400 });
  const title = (body.title ?? product).trim();
  const bullets = (body.bullets ?? []).slice(0, 5);
  const description = (body.description ?? "").trim().slice(0, 1000);
  const keywords = (body.keywords ?? "").trim().slice(0, 300);
  const price = (body.price ?? "").trim();
  const imageCount = body.imageCount ?? 0;
  const key = `lh:${product.toLowerCase()}|${title.slice(0, 30)}`;
  const cached = lhc.get(key); if (cached && cached.expiresAt > now) return NextResponse.json({ ...cached.payload, fromCache: true });
  const apiKey = process.env.GEMINI_API_KEY; if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 503 });
  const prompt = `You are an Amazon listing optimization expert. Audit this Amazon listing and give a health score.

Product: "${product}"
Title: "${title}"
Bullet Points: ${bullets.length > 0 ? bullets.map((b, i) => `${i + 1}. ${b}`).join("\n") : "Not provided"}
Description: "${description || "Not provided"}"
Keywords: "${keywords || "Not provided"}"
Price: "${price || "Not provided"}"
Image Count: ${imageCount}

Analyze every aspect and return ONLY valid JSON:
{
  "overallScore": 72,
  "grade": "B",
  "scores": {
    "title": 80,
    "bullets": 65,
    "keywords": 70,
    "description": 55,
    "images": 40,
    "price": 75
  },
  "issues": [
    {
      "section": "Title",
      "severity": "Warning",
      "current": "What's currently wrong (be specific)",
      "fix": "Exactly what to change or add",
      "impact": "Expected improvement e.g. +15% CTR"
    }
  ],
  "strengths": ["What's already good 1", "What's already good 2", "What's already good 3"],
  "topPriority": "The single most important thing to fix right now (1-2 sentences)",
  "estimatedRankBoost": "e.g. +20-40 positions if all issues fixed"
}
Rules:
- severity must be exactly: "Critical", "Warning", or "Suggestion"
- grade: A (90+), B (75-89), C (60-74), D (45-59), F (<45)
- Generate 4-7 specific, actionable issues
- If title is not provided, treat as missing and score = 0
- If bullets are empty, mark as Critical issue
- Be harsh but fair — most listings score 50-75
- Return ONLY JSON`;
  let lastErr = "";
  for (const m of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 2000 } }), signal: AbortSignal.timeout(18000) });
      if (!r.ok) { lastErr = `HTTP ${r.status}`; continue; }
      const d = await r.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const t = d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ""; if (!t) continue;
      const c = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const match = c.match(/\{[\s\S]*\}/); if (!match) continue;
      const p = JSON.parse(match[0]) as Partial<HealthPayload>;
      const score = Math.min(100, Math.max(0, p.overallScore ?? 50));
      const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 45 ? "D" : "F";
      const payload: HealthPayload = { product, overallScore: score, grade, scores: p.scores ?? { title: 50, bullets: 50, keywords: 50, description: 50, images: 50, price: 50 }, issues: p.issues ?? [], strengths: p.strengths ?? [], topPriority: p.topPriority ?? "", estimatedRankBoost: p.estimatedRankBoost ?? "", generatedAt: new Date().toISOString() };
      lhc.set(key, { expiresAt: Date.now() + CACHE_TTL, payload });
      return NextResponse.json({ ...payload, fromCache: false });
    } catch (e) { lastErr = e instanceof Error ? e.message : "Unknown"; }
  }
  return NextResponse.json({ error: lastErr }, { status: 500 });
}
