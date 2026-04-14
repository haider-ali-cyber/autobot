import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
const CACHE_TTL = 20 * 60 * 1000, RL_WINDOW = 60 * 1000, RL_MAX = 20;
interface CE { expiresAt: number; payload: InventoryPayload; }
interface RE { count: number; resetAt: number; }
const gs = globalThis as typeof globalThis & { __selloraIC?: Map<string, CE>; __selloraIR?: Map<string, RE>; };
const ic = gs.__selloraIC ?? new Map<string, CE>(); gs.__selloraIC = ic;
const ir = gs.__selloraIR ?? new Map<string, RE>(); gs.__selloraIR = ir;
export interface InventoryAlert { product: string; currentStock: number; dailySales: number; daysLeft: number; reorderPoint: number; reorderQty: number; riskLevel: "Critical" | "Warning" | "Healthy"; action: string; leadTimeDays: number; }
export interface InventoryPayload { alerts: InventoryAlert[]; summary: { critical: number; warning: number; healthy: number; totalValue: string }; recommendations: string[]; generatedAt: string; }
function ip(req: NextRequest) { const ff = req.headers.get("x-forwarded-for"); return ff ? ff.split(",")[0]?.trim() ?? "u" : req.headers.get("x-real-ip") ?? "u"; }
function rl(i: string) { const now = Date.now(), e = ir.get(i); if (!e || e.resetAt <= now) { ir.set(i, { count: 1, resetAt: now + RL_WINDOW }); return null; } if (e.count >= RL_MAX) return Math.max(1, Math.ceil((e.resetAt - now) / 1000)); ir.set(i, { ...e, count: e.count + 1 }); return null; }
const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];
export async function POST(req: NextRequest) {
  const now = Date.now();
  for (const [k, v] of ic) if (v.expiresAt <= now) ic.delete(k);
  for (const [k, v] of ir) if (v.resetAt <= now) ir.delete(k);
  const wait = rl(ip(req)); if (wait !== null) return NextResponse.json({ error: "Rate limit", retryAfter: wait }, { status: 429 });
  const body = await req.json().catch(() => ({})) as { products?: { name: string; stock: number; dailySales: number; costPerUnit: number; leadTimeDays?: number }[] };
  const products = (body.products ?? []).slice(0, 20);
  if (products.length === 0) return NextResponse.json({ error: "products array required" }, { status: 400 });

  // Calculate locally — no AI needed for math
  const alerts: InventoryAlert[] = products.map(p => {
    const daily = Math.max(0.1, p.dailySales);
    const lead = p.leadTimeDays ?? 30;
    const daysLeft = Math.floor(p.stock / daily);
    const reorderPoint = Math.ceil(daily * (lead + 7));
    const reorderQty = Math.ceil(daily * 60);
    let riskLevel: "Critical" | "Warning" | "Healthy";
    let action: string;
    if (daysLeft <= 14) { riskLevel = "Critical"; action = `Order ${reorderQty} units immediately — only ${daysLeft} days of stock left!`; }
    else if (daysLeft <= 30) { riskLevel = "Warning"; action = `Place reorder of ${reorderQty} units within 7 days to avoid stockout`; }
    else { riskLevel = "Healthy"; action = `Stock healthy. Next reorder when stock drops to ${reorderPoint} units`; }
    return { product: p.name, currentStock: p.stock, dailySales: daily, daysLeft, reorderPoint, reorderQty, riskLevel, action, leadTimeDays: lead };
  });

  const critical = alerts.filter(a => a.riskLevel === "Critical").length;
  const warning = alerts.filter(a => a.riskLevel === "Warning").length;
  const healthy = alerts.filter(a => a.riskLevel === "Healthy").length;
  const totalValue = `$${products.reduce((s, p, i) => s + (alerts[i] ? alerts[i].currentStock * (p.costPerUnit ?? 10) : 0), 0).toLocaleString()}`;

  // Use Gemini only for strategic recommendations
  const apiKey = process.env.GEMINI_API_KEY;
  let recommendations: string[] = [
    "Maintain 45-60 days of safety stock for FBA to avoid ranking drops during stockouts.",
    "Place reorders when stock hits 2× your lead time × daily sales rate.",
    "Consider sea freight for reorders and air freight only for emergency restocks.",
  ];

  if (apiKey && products.length > 0) {
    try {
      const prompt = `Amazon FBA inventory expert. Given these products and their stock situations, give 4 specific strategic recommendations.
Products: ${products.map((p, i) => `${p.name}: ${alerts[i]?.daysLeft ?? 0} days left`).join(", ")}
Return ONLY a JSON array of 4 strings: ["tip1","tip2","tip3","tip4"]`;
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 400 } }), signal: AbortSignal.timeout(10000) });
      if (r.ok) {
        const d = await r.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const t = d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
        const m = t.match(/\[[\s\S]*\]/);
        if (m) { const parsed = JSON.parse(m[0]) as string[]; if (Array.isArray(parsed) && parsed.length > 0) recommendations = parsed; }
      }
    } catch { /* use fallback */ }
  }

  const payload: InventoryPayload = { alerts, summary: { critical, warning, healthy, totalValue }, recommendations, generatedAt: new Date().toISOString() };
  return NextResponse.json(payload);
}
