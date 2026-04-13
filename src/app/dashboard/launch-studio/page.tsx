"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Rocket, Sparkles, Copy, Check, ChevronRight,
  ShoppingBag, Store, Globe, Smartphone, Users, Image as ImageIcon,
} from "lucide-react";

type Tab = "amazon" | "shopify" | "meta" | "tiktok" | "google" | "audience" | "image";

interface LaunchResult {
  amazon: { title: string; bullets: string[]; description: string; backendKeywords: string[]; suggestedPrice: string };
  shopify: { title: string; description: string; tags: string[]; metaTitle: string; metaDescription: string };
  meta: { primaryHook: string; primaryText: string; headline: string; cta: string; variations: { hook: string; text: string; headline: string }[] };
  tiktok: { hook: string; script: string; hashtags: string[]; cta: string };
  google: { headlines: string[]; descriptions: string[]; keywords: string[] };
  audience: { ageRange: string; gender: string; interests: string[]; painPoints: string[]; buyingMotivation: string };
  imagePrompt: string;
}

const categories = ["Electronics", "Health & Beauty", "Home & Kitchen", "Sports & Outdoors", "Clothing", "Toys & Games", "Pet Supplies", "Office Products", "Baby", "Automotive", "Other"];

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{value}</p>
        </div>
        <CopyBtn text={value} />
      </div>
    </div>
  );
}

function TagList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <CopyBtn text={items.join(", ")} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((t, i) => <Badge key={i} variant="outline">{t}</Badge>)}
      </div>
    </div>
  );
}

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "amazon",   label: "Amazon",   icon: ShoppingBag },
  { id: "shopify",  label: "Shopify",  icon: Store },
  { id: "meta",     label: "Meta Ads", icon: Globe },
  { id: "tiktok",   label: "TikTok",   icon: Smartphone },
  { id: "google",   label: "Google",   icon: Globe },
  { id: "audience", label: "Audience", icon: Users },
  { id: "image",    label: "AI Image", icon: ImageIcon },
];

export default function LaunchStudioPage() {
  const [step, setStep] = useState<"form" | "result">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("amazon");
  const [result, setResult] = useState<LaunchResult | null>(null);

  const [form, setForm] = useState({
    productName: "", category: "Electronics", priceRange: "",
    targetMarket: "", usp: "", keywords: "",
  });

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  async function generate() {
    if (!form.productName.trim()) { setError("Product name required"); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/ai/launch-studio", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { ok?: boolean; result?: LaunchResult; error?: string };
      if (!res.ok || !data.ok) { setError(data.error ?? "Generation failed"); return; }
      setResult(data.result!);
      setStep("result");
      setActiveTab("amazon");
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  function downloadAmazonCSV() {
    if (!result) return;
    const rows = [
      ["Field", "Value"],
      ["Title", result.amazon.title],
      ["Bullet 1", result.amazon.bullets[0] ?? ""],
      ["Bullet 2", result.amazon.bullets[1] ?? ""],
      ["Bullet 3", result.amazon.bullets[2] ?? ""],
      ["Bullet 4", result.amazon.bullets[3] ?? ""],
      ["Bullet 5", result.amazon.bullets[4] ?? ""],
      ["Description", result.amazon.description],
      ["Backend Keywords", result.amazon.backendKeywords.join(", ")],
      ["Suggested Price", result.amazon.suggestedPrice],
    ];
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `amazon-listing-${form.productName.replace(/\s+/g, "-")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Launch Studio" />
      <main className="flex-1 overflow-y-auto p-6">

        {step === "form" && (
          <div className="max-w-2xl mx-auto space-y-5">
            <Card>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                  <Rocket className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">AI Launch Studio</h2>
                  <p className="text-xs text-gray-500">Product details daalo — Amazon listing, Shopify page, Meta + TikTok + Google ads sab generate ho jaayenge</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Product Name *</label>
                  <input value={form.productName} onChange={e => set("productName", e.target.value)}
                    placeholder="e.g. Electric Neck Massager with Heat"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
                    <select value={form.category} onChange={e => set("category", e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 cursor-pointer">
                      {categories.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Price Range</label>
                    <input value={form.priceRange} onChange={e => set("priceRange", e.target.value)}
                      placeholder="e.g. $25 - $45"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Target Market</label>
                  <input value={form.targetMarket} onChange={e => set("targetMarket", e.target.value)}
                    placeholder="e.g. Office workers with neck pain, ages 25-55"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Unique Selling Point (USP)</label>
                  <input value={form.usp} onChange={e => set("usp", e.target.value)}
                    placeholder="e.g. 6 massage modes, rechargeable, portable design"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Keywords (optional)</label>
                  <input value={form.keywords} onChange={e => set("keywords", e.target.value)}
                    placeholder="e.g. neck massager, cervical massager, pain relief"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500" />
                </div>

                {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

                <Button onClick={generate} loading={loading} size="md" className="w-full">
                  <Sparkles className="w-4 h-4" />
                  {loading ? "Generating complete launch package..." : "Generate Launch Package"}
                  {!loading && <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: ShoppingBag, label: "Amazon Listing", color: "text-amber-600 bg-amber-50" },
                { icon: Store, label: "Shopify Page", color: "text-green-600 bg-green-50" },
                { icon: Globe, label: "Meta + Google Ads", color: "text-blue-600 bg-blue-50" },
                { icon: Smartphone, label: "TikTok Script", color: "text-pink-600 bg-pink-50" },
              ].map(item => (
                <div key={item.label} className="flex flex-col items-center gap-2 p-3 bg-white border border-gray-100 rounded-xl text-center">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-medium text-gray-700">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Launch Package — {form.productName}</h2>
                <p className="text-xs text-gray-500 mt-0.5">AI-generated complete launch kit</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={downloadAmazonCSV}>Amazon CSV</Button>
                <Button size="sm" onClick={() => { setStep("form"); setResult(null); }}>
                  <Rocket className="w-3.5 h-3.5" /> New Launch
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}>
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Amazon */}
            {activeTab === "amazon" && (
              <Card className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-amber-500" /> Amazon Listing</h3>
                  <Badge variant="warning">{result.amazon.suggestedPrice}</Badge>
                </div>
                <Field label="Title" value={result.amazon.title} />
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Bullet Points</p>
                    <CopyBtn text={result.amazon.bullets.join("\n")} />
                  </div>
                  <ul className="space-y-1.5">
                    {result.amazon.bullets.map((b, i) => <li key={i} className="text-sm text-gray-800">{b}</li>)}
                  </ul>
                </div>
                <Field label="Description" value={result.amazon.description} />
                <TagList label="Backend Keywords" items={result.amazon.backendKeywords} />
              </Card>
            )}

            {/* Shopify */}
            {activeTab === "shopify" && (
              <Card className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Store className="w-4 h-4 text-green-500" /> Shopify Product Page</h3>
                  <Badge variant="success">Ready to publish</Badge>
                </div>
                <Field label="Product Title" value={result.shopify.title} />
                <Field label="Description (HTML-ready)" value={result.shopify.description} />
                <TagList label="Tags" items={result.shopify.tags} />
                <Field label="Meta Title (SEO)" value={result.shopify.metaTitle} />
                <Field label="Meta Description (SEO)" value={result.shopify.metaDescription} />
                <div className="p-3 bg-green-50 rounded-lg border border-green-100 flex items-center justify-between">
                  <p className="text-xs text-green-700 font-medium">🔗 Shopify Direct Publish — Integrations mein store connect karo</p>
                  <Button size="sm" variant="secondary" onClick={() => window.location.href = "/dashboard/integrations"}>Connect Store</Button>
                </div>
              </Card>
            )}

            {/* Meta */}
            {activeTab === "meta" && (
              <Card className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1"><Globe className="w-4 h-4 text-blue-500" /> Meta Ads (Facebook + Instagram)</h3>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-400 mb-2">Primary Ad (Variation 1)</p>
                  <Field label="Hook (First Line)" value={result.meta.primaryHook} />
                  <div className="mt-2"><Field label="Ad Text" value={result.meta.primaryText} /></div>
                  <div className="mt-2 flex gap-2">
                    <div className="flex-1"><Field label="Headline" value={result.meta.headline} /></div>
                    <div className="w-24"><Field label="CTA" value={result.meta.cta} /></div>
                  </div>
                </div>
                {result.meta.variations.map((v, i) => (
                  <div key={i} className="p-3 bg-gray-50 border border-gray-100 rounded-lg space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Variation {i + 2}</p>
                    <Field label="Hook" value={v.hook} />
                    <Field label="Ad Text" value={v.text} />
                    <Field label="Headline" value={v.headline} />
                  </div>
                ))}
              </Card>
            )}

            {/* TikTok */}
            {activeTab === "tiktok" && (
              <Card className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1"><Smartphone className="w-4 h-4 text-pink-500" /> TikTok Ad Script</h3>
                <Field label="Hook (First 3 seconds)" value={result.tiktok.hook} />
                <Field label="Full Script (30-60 sec)" value={result.tiktok.script} />
                <Field label="Call to Action" value={result.tiktok.cta} />
                <TagList label="Hashtags" items={result.tiktok.hashtags} />
              </Card>
            )}

            {/* Google */}
            {activeTab === "google" && (
              <Card className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1"><Globe className="w-4 h-4 text-blue-600" /> Google Ads</h3>
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Headlines (15)</p>
                    <CopyBtn text={result.google.headlines.join("\n")} />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {result.google.headlines.map((h, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 w-4">{i + 1}.</span>
                        <span className="text-xs text-gray-800">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Descriptions (4)</p>
                    <CopyBtn text={result.google.descriptions.join("\n")} />
                  </div>
                  <ul className="space-y-1.5">
                    {result.google.descriptions.map((d, i) => <li key={i} className="text-xs text-gray-800">{i + 1}. {d}</li>)}
                  </ul>
                </div>
                <TagList label="Target Keywords" items={result.google.keywords} />
              </Card>
            )}

            {/* Audience */}
            {activeTab === "audience" && (
              <Card className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-purple-500" /> Target Audience Profile</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Age Range" value={result.audience.ageRange} />
                  <Field label="Gender" value={result.audience.gender} />
                </div>
                <Field label="Buying Motivation" value={result.audience.buyingMotivation} />
                <TagList label="Interests" items={result.audience.interests} />
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Pain Points</p>
                  <ul className="space-y-1.5">
                    {result.audience.painPoints.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                        <span className="text-red-400 mt-0.5">•</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            )}

            {/* Image Prompt */}
            {activeTab === "image" && (
              <Card className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1"><ImageIcon className="w-4 h-4 text-indigo-500" /> AI Image Prompt</h3>
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-indigo-900 leading-relaxed flex-1">{result.imagePrompt}</p>
                    <CopyBtn text={result.imagePrompt} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { name: "DALL-E 3", url: "https://chat.openai.com", color: "bg-gray-900 text-white", label: "Open ChatGPT" },
                    { name: "Midjourney", url: "https://midjourney.com", color: "bg-purple-600 text-white", label: "Open Midjourney" },
                    { name: "Adobe Firefly", url: "https://firefly.adobe.com", color: "bg-red-600 text-white", label: "Open Firefly (Free)" },
                  ].map(tool => (
                    <a key={tool.name} href={tool.url} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-90 ${tool.color}`}>
                      {tool.label} →
                    </a>
                  ))}
                </div>
                <p className="text-xs text-gray-400 text-center">Prompt copy karo → kisi bhi tool mein paste karo → product ad image generate karo</p>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
