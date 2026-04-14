import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CACHE_TTL_MS = 20 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 15;

interface CacheEntry { expiresAt: number; payload: SuppliersPayload; }
interface RateLimitEntry { count: number; resetAt: number; }

const globalStore = globalThis as typeof globalThis & {
  __selloraSupCache?: Map<string, CacheEntry>;
  __selloraSupRL?: Map<string, RateLimitEntry>;
};
const supCache = globalStore.__selloraSupCache ?? new Map<string, CacheEntry>();
const supRL = globalStore.__selloraSupRL ?? new Map<string, RateLimitEntry>();
globalStore.__selloraSupCache = supCache;
globalStore.__selloraSupRL = supRL;

export interface Supplier {
  name: string;
  location: string;
  country: string;
  countryFlag: string;
  moq: number;
  unitCost: string;
  leadTime: string;
  rating: number;
  orders: number;
  verified: boolean;
  tradeAssurance: boolean;
  samples: string;
  tags: string[];
  speciality: string;
  alibabaUrl: string;
}

export interface SuppliersPayload {
  suppliers: Supplier[];
  negotiationTemplate: string;
  profitCalc: { label: string; value: string; color: string }[];
  generatedAt: string;
}

function getClientIp(req: NextRequest) {
  const ff = req.headers.get("x-forwarded-for");
  if (ff) return ff.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function checkRL(ip: string): number | null {
  const now = Date.now();
  const e = supRL.get(ip);
  if (!e || e.resetAt <= now) { supRL.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS }); return null; }
  if (e.count >= RATE_LIMIT_MAX_REQUESTS) return Math.max(1, Math.ceil((e.resetAt - now) / 1000));
  e.count += 1; supRL.set(ip, e); return null;
}

const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];

async function callGemini(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.75, maxOutputTokens: 3000 },
      }),
      signal: AbortSignal.timeout(20000),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }
  const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

export async function POST(req: NextRequest) {
  const now = Date.now();
  for (const [k, v] of supCache) if (v.expiresAt <= now) supCache.delete(k);
  for (const [k, v] of supRL) if (v.resetAt <= now) supRL.delete(k);

  const ip = getClientIp(req);
  const wait = checkRL(ip);
  if (wait !== null) return NextResponse.json({ error: "Rate limit exceeded", retryAfter: wait }, { status: 429 });

  const body = await req.json().catch(() => ({})) as { product?: string; country?: string };
  const product = (body.product ?? "").trim().slice(0, 100);
  const country = (body.country ?? "All").trim();
  if (!product) return NextResponse.json({ error: "product is required" }, { status: 400 });

  const cacheKey = `${product.toLowerCase()}|${country.toLowerCase()}`;
  const cached = supCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return NextResponse.json({ ...cached.payload, fromCache: true });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });

  const countryFilter = country !== "All" ? `Focus on suppliers from ${country}.` : "Include suppliers from China, USA, UK, India, and Vietnam.";

  const prompt = `You are a sourcing expert for Amazon FBA and Shopify sellers.

Generate realistic supplier data for: "${product}"
${countryFilter}

Return ONLY valid JSON:
{
  "suppliers": [
    {
      "name": "Supplier Company Name",
      "location": "City, Country",
      "country": "China",
      "countryFlag": "🇨🇳",
      "moq": 50,
      "unitCost": "$6.50",
      "leadTime": "12-15 days",
      "rating": 4.7,
      "orders": 2340,
      "verified": true,
      "tradeAssurance": true,
      "samples": "$18",
      "tags": ["Top Supplier", "Fast Ship"],
      "speciality": "Health & Wellness devices",
      "alibabaUrl": "https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(product)}"
    }
  ],
  "negotiationTemplate": "Subject: Inquiry for ${product}...(full email template)",
  "profitCalc": [
    { "label": "Unit Cost (supplier)", "value": "$6.50", "color": "text-gray-600" },
    { "label": "Shipping to USA / unit", "value": "$1.80", "color": "text-gray-600" },
    { "label": "Import Duty", "value": "$0.50", "color": "text-gray-600" },
    { "label": "Amazon FBA Fee", "value": "$4.50", "color": "text-gray-600" },
    { "label": "Total Cost per Unit", "value": "$13.30", "color": "text-amber-600" },
    { "label": "Selling Price", "value": "$34.99", "color": "text-gray-600" },
    { "label": "Net Profit per Unit", "value": "$21.69", "color": "text-green-600" },
    { "label": "ROI", "value": "163%", "color": "text-blue-600" }
  ]
}

Rules:
- Generate 6-8 realistic suppliers
- countryFlag must be correct emoji flag
- country must be one of: China, USA, UK, India, Vietnam
- rating: 4.0-5.0
- tags from: ["Top Supplier", "Best Price", "Low MOQ", "Fast Ship", "FBA Ready", "USA Warehouse", "UK Warehouse", "Low Tariff", "Bulk Only", "Amazon UK Ready"]
- profitCalc must reflect the actual product's realistic pricing
- negotiationTemplate must be a complete professional email for ${product}
- Return ONLY the JSON object, no markdown`;

  let lastError = "";

  for (const modelName of MODELS) {
    try {
      const text = await callGemini(apiKey, modelName, prompt);
      if (!text) continue;
      const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      const parsed = JSON.parse(jsonMatch[0]) as Partial<SuppliersPayload>;

      const payload: SuppliersPayload = {
        suppliers: parsed.suppliers ?? [],
        negotiationTemplate: parsed.negotiationTemplate ?? "",
        profitCalc: parsed.profitCalc ?? [],
        generatedAt: new Date().toISOString(),
      };

      supCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
      return NextResponse.json({ ...payload, fromCache: false });
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return NextResponse.json({ error: lastError }, { status: 500 });
}
