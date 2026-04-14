import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CACHE_TTL_MS = 30 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 15;

interface CacheEntry { expiresAt: number; payload: CompliancePayload; }
interface RateLimitEntry { count: number; resetAt: number; }

const globalStore = globalThis as typeof globalThis & {
  __selloraCompCache?: Map<string, CacheEntry>;
  __selloraCompRL?: Map<string, RateLimitEntry>;
};
const compCache = globalStore.__selloraCompCache ?? new Map<string, CacheEntry>();
const compRL = globalStore.__selloraCompRL ?? new Map<string, RateLimitEntry>();
globalStore.__selloraCompCache = compCache;
globalStore.__selloraCompRL = compRL;

export interface CertItem { name: string; required: boolean; status: "Required" | "Not Required" | "Optional"; note: string; }
export interface AmazonCheck { check: string; status: "Pass" | "Fail" | "Warn"; note: string; }
export interface CustomsItem { market: string; duty: string; vat: string; notes: string; }

export interface CompliancePayload {
  product: string;
  hsCode: string;
  importDuty: string;
  restrictions: string[];
  certifications: CertItem[];
  amazonChecks: AmazonCheck[];
  customs: CustomsItem[];
  certsRequired: number;
  generatedAt: string;
}

function getClientIp(req: NextRequest) {
  const ff = req.headers.get("x-forwarded-for");
  if (ff) return ff.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function checkRL(ip: string): number | null {
  const now = Date.now();
  const e = compRL.get(ip);
  if (!e || e.resetAt <= now) { compRL.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }); return null; }
  if (e.count >= RATE_LIMIT_MAX_REQUESTS) return Math.max(1, Math.ceil((e.resetAt - now) / 1000));
  e.count += 1; compRL.set(ip, e); return null;
}

const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];

export async function POST(req: NextRequest) {
  const now = Date.now();
  for (const [k, v] of compCache) if (v.expiresAt <= now) compCache.delete(k);
  for (const [k, v] of compRL) if (v.resetAt <= now) compRL.delete(k);

  const ip = getClientIp(req);
  const wait = checkRL(ip);
  if (wait !== null) return NextResponse.json({ error: "Rate limit exceeded", retryAfter: wait }, { status: 429 });

  const body = await req.json().catch(() => ({})) as { product?: string; market?: string };
  const product = (body.product ?? "").trim().slice(0, 100);
  const market = (body.market ?? "USA Market").trim();
  if (!product) return NextResponse.json({ error: "product is required" }, { status: 400 });

  const cacheKey = `${product.toLowerCase()}|${market.toLowerCase()}`;
  const cached = compCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return NextResponse.json({ ...cached.payload, fromCache: true });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });

  const prompt = `You are a trade compliance and Amazon policy expert.

Generate a compliance report for: "${product}" targeting ${market}

Return ONLY valid JSON:
{
  "hsCode": "9019.10.20",
  "importDuty": "3.9%",
  "restrictions": [],
  "certifications": [
    {
      "name": "FCC (USA)",
      "required": true,
      "status": "Required",
      "note": "reason"
    }
  ],
  "amazonChecks": [
    {
      "check": "FBA Hazmat",
      "status": "Pass",
      "note": "explanation"
    }
  ],
  "customs": [
    {
      "market": "USA",
      "duty": "3.9%",
      "vat": "—",
      "notes": "rule note"
    }
  ]
}

Rules:
- hsCode: realistic 10-digit HS tariff code for this product
- importDuty: realistic USA import duty percentage
- restrictions: array of strings (empty [] if none)
- certifications: 4-6 relevant certifications (FCC, CE, RoHS, FDA, UL, CPSC, etc.)
- status: MUST be exactly "Required", "Not Required", or "Optional"
- amazonChecks: 5 checks covering FBA Hazmat, restricted category, brand registry, image policy, title limit
- status: MUST be exactly "Pass", "Fail", or "Warn"
- customs: exactly 4 markets — USA, UK, EU, Canada
- Return ONLY the JSON object, no markdown`;

  let lastError = "";

  for (const modelName of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
          }),
          signal: AbortSignal.timeout(15000),
        }
      );
      if (!res.ok) { const e = await res.json().catch(() => ({})) as { error?: { message?: string } }; lastError = e?.error?.message ?? `HTTP ${res.status}`; continue; }
      const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      if (!text) continue;
      const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      const parsed = JSON.parse(jsonMatch[0]) as Partial<CompliancePayload>;

      const certs = parsed.certifications ?? [];
      const payload: CompliancePayload = {
        product,
        hsCode: parsed.hsCode ?? "—",
        importDuty: parsed.importDuty ?? "—",
        restrictions: parsed.restrictions ?? [],
        certifications: certs,
        amazonChecks: parsed.amazonChecks ?? [],
        customs: parsed.customs ?? [],
        certsRequired: certs.filter(c => c.required).length,
        generatedAt: new Date().toISOString(),
      };

      compCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
      return NextResponse.json({ ...payload, fromCache: false });
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return NextResponse.json({ error: lastError }, { status: 500 });
}
