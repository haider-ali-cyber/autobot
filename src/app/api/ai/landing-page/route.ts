import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
const CACHE_TTL = 60 * 60 * 1000, RL_WINDOW = 60 * 1000, RL_MAX = 10;
interface CE { expiresAt: number; html: string; }
interface RE { count: number; resetAt: number; }
const gs = globalThis as typeof globalThis & { __selloraLPC?: Map<string, CE>; __selloraLPR?: Map<string, RE>; };
const lpc = gs.__selloraLPC ?? new Map<string, CE>(); gs.__selloraLPC = lpc;
const lpr = gs.__selloraLPR ?? new Map<string, RE>(); gs.__selloraLPR = lpr;
function ip(req: NextRequest) { const ff = req.headers.get("x-forwarded-for"); return ff ? ff.split(",")[0]?.trim() ?? "u" : req.headers.get("x-real-ip") ?? "u"; }
function rl(i: string) { const now = Date.now(), e = lpr.get(i); if (!e || e.resetAt <= now) { lpr.set(i, { count: 1, resetAt: now + RL_WINDOW }); return null; } if (e.count >= RL_MAX) return Math.max(1, Math.ceil((e.resetAt - now) / 1000)); e.count++; lpr.set(i, e); return null; }
const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];
export async function POST(req: NextRequest) {
  const now = Date.now();
  for (const [k, v] of lpc) if (v.expiresAt <= now) lpc.delete(k);
  for (const [k, v] of lpr) if (v.resetAt <= now) lpr.delete(k);
  const wait = rl(ip(req)); if (wait !== null) return NextResponse.json({ error: "Rate limit", retryAfter: wait }, { status: 429 });
  const body = await req.json().catch(() => ({})) as { product?: string; price?: string; features?: string[]; cta?: string; color?: string };
  const product = (body.product ?? "").trim().slice(0, 100);
  const price = (body.price ?? "29.99").trim();
  const features = (body.features ?? []).slice(0, 6);
  const cta = (body.cta ?? "Shop Now").trim();
  const color = (body.color ?? "#2563eb").trim();
  if (!product) return NextResponse.json({ error: "product required" }, { status: 400 });
  const key = `${product.toLowerCase()}|${price}|${color}`;
  const cached = lpc.get(key); if (cached && cached.expiresAt > now) return NextResponse.json({ html: cached.html, fromCache: true });
  const apiKey = process.env.GEMINI_API_KEY; if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 503 });
  const prompt = `You are an expert e-commerce landing page developer. Create a complete, beautiful, conversion-optimized HTML landing page.

Product: "${product}"
Price: $${price}
Key Features: ${features.length > 0 ? features.join(", ") : "to be determined based on product"}
CTA Button Text: "${cta}"
Brand Color: ${color}

Generate a complete single-file HTML page with embedded CSS and no external dependencies (no CDN links).
The page must include:
1. A sticky header with product name and a CTA button
2. A hero section with headline, subheadline, price, and CTA button
3. A features/benefits section (3-6 feature cards with icons using CSS)
4. A social proof section (3 fake customer reviews with stars)
5. A "How it works" section (3 steps)
6. A final CTA section with urgency text
7. A minimal footer

Design requirements:
- Use the brand color ${color} for primary elements
- Modern, clean design with good whitespace
- Mobile responsive using flexbox/grid
- Use CSS custom properties for theming
- Smooth hover effects on buttons and cards
- Professional typography using system fonts
- Conversion-optimized copy based on the product

Return ONLY the complete HTML code starting with <!DOCTYPE html>. No explanation, no markdown fences.`;
  let lastErr = "";
  for (const m of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 4000 } }), signal: AbortSignal.timeout(25000) });
      if (!r.ok) { lastErr = `HTTP ${r.status}`; continue; }
      const d = await r.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      let html = d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ""; if (!html) continue;
      html = html.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
      if (!html.toLowerCase().startsWith("<!doctype")) continue;
      lpc.set(key, { expiresAt: Date.now() + CACHE_TTL, html });
      return NextResponse.json({ html, fromCache: false });
    } catch (e) { lastErr = e instanceof Error ? e.message : "Unknown"; }
  }
  return NextResponse.json({ error: lastErr }, { status: 500 });
}
