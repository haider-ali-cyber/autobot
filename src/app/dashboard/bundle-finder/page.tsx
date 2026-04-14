"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Plus, X, Zap, AlertCircle, TrendingUp, Star, DollarSign } from "lucide-react";

interface BundleIdea {
  name: string;
  products: string[];
  price: string;
  costEstimate: string;
  profitMargin: string;
  whyItWorks: string;
  salesLiftEstimate: string;
  targetCustomer: string;
  platform: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

interface BundleData {
  bundles: BundleIdea[];
  topBundle: string;
  insights: string[];
}

const DIFF_COLORS: Record<string, string> = {
  Easy: "text-green-600 bg-green-50 border-green-200",
  Medium: "text-amber-600 bg-amber-50 border-amber-200",
  Hard: "text-red-600 bg-red-50 border-red-200",
};

export default function BundleFinderPage() {
  const [products, setProducts] = useState<string[]>(["Neck Massager", "Heat Pad"]);
  const [input, setInput] = useState("");
  const [niche, setNiche] = useState("Amazon FBA");
  const [budget, setBudget] = useState("60");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BundleData | null>(null);

  function addProduct() {
    const v = input.trim();
    if (!v || products.length >= 8 || products.includes(v)) return;
    setProducts(p => [...p, v]);
    setInput("");
  }

  function removeProduct(p: string) { setProducts(prev => prev.filter(x => x !== p)); }

  async function handleFind() {
    if (products.length < 1) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/ai/bundle-finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products, niche, budget }),
      });
      const json = await res.json() as BundleData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Bundle Opportunity Finder" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        <Card>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your Products</p>
              <div className="flex gap-2 mb-2">
                <input value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addProduct()}
                  placeholder='Add product e.g. "Yoga Mat"'
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                <Button size="sm" variant="secondary" onClick={addProduct}><Plus className="w-3.5 h-3.5" /></Button>
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-[36px]">
                {products.map(p => (
                  <span key={p} className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-full">
                    {p}
                    <button onClick={() => removeProduct(p)} className="hover:text-red-500 cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {products.length === 0 && <span className="text-xs text-gray-400">Add at least 1 product</span>}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Niche / Platform</p>
              <select value={niche} onChange={e => setNiche(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none cursor-pointer">
                <option>Amazon FBA</option><option>Shopify</option><option>TikTok Shop</option>
                <option>Health & Beauty</option><option>Home & Kitchen</option><option>Sports & Fitness</option>
              </select>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400 shrink-0" />
                <input value={budget} onChange={e => setBudget(e.target.value.replace(/\D/g, ""))}
                  placeholder="Max bundle price"
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <Button onClick={handleFind} loading={loading} disabled={products.length < 1}>
                <Zap className="w-4 h-4" /> Find Bundle Opportunities
              </Button>
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
                </div>
              )}
            </div>
          </div>
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-gray-500">AI finding bundle opportunities...</span>
          </div>
        )}

        {!loading && !data && !error && (
          <div className="text-center py-16 text-sm text-gray-400">
            Add your products above and click Find Bundle Opportunities to discover profitable combos.
          </div>
        )}

        {!loading && data && (
          <>
            {data.topBundle && (
              <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                <Star className="w-5 h-5 text-amber-500 shrink-0 fill-amber-500" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Top Bundle to Launch First</p>
                  <p className="text-xs text-amber-700">{data.topBundle}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">{data.bundles.length} Bundle Ideas</h3>
                {data.bundles.map((b, i) => (
                  <Card key={i}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900">{b.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {b.products.map(p => (
                            <span key={p} className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs rounded-full">{p}</span>
                          ))}
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold shrink-0 ml-2 ${DIFF_COLORS[b.difficulty] ?? ""}`}>{b.difficulty}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {[
                        { label: "Bundle Price", value: b.price, color: "text-blue-600" },
                        { label: "Est. Cost", value: b.costEstimate, color: "text-red-600" },
                        { label: "Profit Margin", value: b.profitMargin, color: "text-green-600" },
                      ].map(s => (
                        <div key={s.label} className="bg-gray-50 rounded-lg p-2.5 text-center border border-gray-100">
                          <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-xs text-gray-400">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <p className="text-gray-600"><span className="font-medium text-gray-800">Why it works:</span> {b.whyItWorks}</p>
                      <p className="text-green-600 font-medium flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> {b.salesLiftEstimate}</p>
                      <p className="text-gray-500"><span className="font-medium text-gray-700">Target:</span> {b.targetCustomer}</p>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="space-y-4">
                <Card>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" /> Bundle Strategy Tips
                  </h3>
                  <ul className="space-y-2.5">
                    {data.insights.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">{i + 1}</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card className="bg-blue-50 border-blue-100">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Pro Tip</p>
                  <p className="text-xs text-blue-600">Bundles typically achieve <strong>30-50% higher AOV</strong> and are harder for competitors to hijack since the bundle ASIN is unique to you.</p>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
