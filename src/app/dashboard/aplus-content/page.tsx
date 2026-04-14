"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Search, AlertCircle, Copy, CheckCheck, Download, Star, ChevronDown, ChevronUp } from "lucide-react";

interface APlusModule { type: string; headline: string; body: string; bulletPoints?: string[]; }
interface APlusData { product: string; brand: string; modules: APlusModule[]; comparisonChart: { feature: string; yourProduct: string; generic: string }[]; brandStory: string; keyBenefits: string[]; }

const CATEGORIES = ["General", "Health & Beauty", "Home & Kitchen", "Electronics", "Sports & Outdoors", "Clothing", "Pet Supplies", "Toys & Games", "Baby Products", "Office Supplies"];

export default function APlusContentPage() {
  const [product, setProduct] = useState("");
  const [brand, setBrand] = useState("");
  const [keywords, setKeywords] = useState("");
  const [category, setCategory] = useState("General");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<APlusData | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  async function handleGenerate() {
    const p = product.trim();
    if (!p) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/ai/aplus-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: p, brand: brand.trim() || "My Brand", keywords, category }),
      });
      const json = await res.json() as APlusData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
      setExpanded(new Set([0]));
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1500);
  }

  function exportContent() {
    if (!data) return;
    let text = `A+ CONTENT — ${data.product}\nBrand: ${data.brand}\n${"=".repeat(60)}\n\n`;
    text += `BRAND STORY\n${data.brandStory}\n\n`;
    text += `KEY BENEFITS\n${data.keyBenefits.map(b => `• ${b}`).join("\n")}\n\n`;
    data.modules.forEach(m => {
      text += `${m.type.toUpperCase()}\n${m.headline}\n${m.body}\n`;
      if (m.bulletPoints) text += m.bulletPoints.map(b => `  • ${b}`).join("\n") + "\n";
      text += "\n";
    });
    text += `COMPARISON CHART\n`;
    text += `Feature | Your Product | Generic\n`;
    data.comparisonChart.forEach(r => { text += `${r.feature} | ${r.yourProduct} | ${r.generic}\n`; });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `aplus-${data.product.replace(/\s+/g, "-").toLowerCase()}.txt`; a.click();
  }

  function toggleExpand(i: number) {
    setExpanded(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="A+ Content Generator" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={product} onChange={e => setProduct(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGenerate()}
                placeholder='Product e.g. "Neck Massager"'
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Brand name"
              className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none cursor-pointer">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <Button onClick={handleGenerate} loading={loading} size="sm">
              <Zap className="w-3.5 h-3.5" /> Generate A+ Content
            </Button>
          </div>
          <input value={keywords} onChange={e => setKeywords(e.target.value)}
            placeholder="Target keywords (optional) e.g. neck massager, electric, shiatsu, heat therapy"
            className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          {error && <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</div>}
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-gray-500">Generating premium A+ content...</span>
          </div>
        )}

        {!loading && !data && !error && (
          <div className="text-center py-16 text-sm text-gray-400">
            Enter your product details to generate Amazon A+ Enhanced Brand Content.
          </div>
        )}

        {!loading && data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-3">
              {/* Brand Story */}
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900">Brand Story</p>
                  <button onClick={() => copy(data.brandStory, "brand")} className="p-1.5 rounded hover:bg-gray-100 cursor-pointer text-gray-400 hover:text-gray-700">
                    {copied === "brand" ? <CheckCheck className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{data.brandStory}</p>
              </Card>

              {/* Content Modules */}
              {data.modules.map((mod, i) => (
                <Card key={i}>
                  <button onClick={() => toggleExpand(i)} className="w-full flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">{mod.type}</span>
                      <p className="text-sm font-semibold text-gray-900 text-left">{mod.headline}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <button onClick={e => { e.stopPropagation(); copy(`${mod.headline}\n\n${mod.body}${mod.bulletPoints ? "\n\n" + mod.bulletPoints.join("\n") : ""}`, `mod-${i}`); }}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 cursor-pointer">
                        {copied === `mod-${i}` ? <CheckCheck className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                      {expanded.has(i) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  {expanded.has(i) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600 leading-relaxed mb-3">{mod.body}</p>
                      {mod.bulletPoints && (
                        <ul className="space-y-1">
                          {mod.bulletPoints.map((b, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                              <span className="text-blue-500 font-bold shrink-0 mt-0.5">•</span> {b}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </Card>
              ))}

              {/* Comparison Chart */}
              <Card>
                <p className="text-sm font-semibold text-gray-900 mb-3">Comparison Chart</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left pb-2 text-gray-500 font-medium">Feature</th>
                        <th className="text-center pb-2 text-blue-600 font-semibold">{data.brand}</th>
                        <th className="text-center pb-2 text-gray-400 font-medium">Generic</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.comparisonChart.map((row, i) => (
                        <tr key={i}>
                          <td className="py-2 text-gray-700 font-medium">{row.feature}</td>
                          <td className="py-2 text-center text-green-600">{row.yourProduct}</td>
                          <td className="py-2 text-center text-gray-400">{row.generic}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Key Benefits + Export */}
            <div className="space-y-4">
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Key Benefits
                  </p>
                  <Button size="sm" variant="secondary" onClick={exportContent}><Download className="w-3.5 h-3.5" /> Export</Button>
                </div>
                <ul className="space-y-2">
                  {data.keyBenefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="bg-blue-50 border-blue-100">
                <p className="text-xs font-semibold text-blue-700 mb-1">📋 How to Use</p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• Copy each module separately to Amazon Seller Central</li>
                  <li>• Upload matching images for each content module</li>
                  <li>• A+ Content can boost conversion by 5-20%</li>
                </ul>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
