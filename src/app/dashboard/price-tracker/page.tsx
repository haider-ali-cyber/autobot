"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Search, AlertCircle, DollarSign, Star, Zap, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface PricePoint { month: string; yourPrice: number; competitorAvg: number; buyBoxPrice: number; }
interface PriceInsight { strategy: string; currentPrice: string; recommendedPrice: string; potentialRevenueChange: string; reason: string; urgency: "High" | "Medium" | "Low"; }
interface PriceData {
  product: string; currentPrice: string; category: string;
  priceHistory: PricePoint[];
  competitors: { name: string; price: string; rating: number; reviews: number; strategy: string }[];
  insights: PriceInsight[];
  optimalPriceRange: string;
  buyBoxTip: string;
}

const URGENCY_COLORS = { High: "danger" as const, Medium: "warning" as const, Low: "success" as const };
const CATEGORIES = ["General", "Electronics", "Health & Beauty", "Home & Kitchen", "Sports & Outdoors", "Clothing & Apparel", "Toys & Games", "Pet Supplies", "Baby", "Office Products"];

export default function PriceTrackerPage() {
  const [product, setProduct] = useState("");
  const [currentPrice, setCurrentPrice] = useState("29.99");
  const [category, setCategory] = useState("General");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PriceData | null>(null);

  async function handleAnalyze() {
    const p = product.trim();
    if (!p) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/ai/price-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: p, currentPrice, category }),
      });
      const json = await res.json() as PriceData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Pricing Strategy Analyzer" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={product} onChange={e => setProduct(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAnalyze()}
                placeholder='Product e.g. "Neck Massager"'
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={currentPrice} onChange={e => setCurrentPrice(e.target.value)}
                placeholder="Current price"
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-8 pr-4 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
              />
            </div>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none cursor-pointer">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <Button onClick={handleAnalyze} loading={loading} size="sm">
              <Zap className="w-3.5 h-3.5" /> Analyze Pricing
            </Button>
          </div>
          {error && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </div>
          )}
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-gray-500">Analyzing pricing strategy with AI...</span>
          </div>
        )}

        {!loading && !data && !error && (
          <div className="text-center py-16 text-sm text-gray-400">
            Enter a product and your current price to get a complete pricing strategy analysis.
          </div>
        )}

        {!loading && data && (
          <>
            {/* Optimal Range Banner */}
            <div className="flex items-center gap-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl flex-wrap">
              <TrendingUp className="w-5 h-5 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-800">Optimal Price Range: <span className="text-green-600">{data.optimalPriceRange}</span></p>
                <p className="text-xs text-green-700">{data.buyBoxTip}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Chart + Competitors */}
              <div className="lg:col-span-2 space-y-5">
                <Card>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">6-Month Price History</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={data.priceHistory}>
                      <XAxis dataKey="month" stroke="#e5e7eb" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#e5e7eb" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                      <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: 12 }} formatter={(v: unknown) => [`$${v}`, ""]} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <Line type="monotone" dataKey="yourPrice" name="Your Price" stroke="#2563eb" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="competitorAvg" name="Competitor Avg" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="buyBoxPrice" name="Buy Box" stroke="#22c55e" strokeWidth={2} dot={false} strokeDasharray="2 3" />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                <Card>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Competitor Pricing</h3>
                  <div className="space-y-3">
                    {data.competitors.map((c, i) => {
                      const cPrice = parseFloat(c.price.replace(/[^0-9.]/g, ""));
                      const myPrice = parseFloat(currentPrice);
                      const diff = myPrice - cPrice;
                      return (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {c.rating}
                              <span>· {c.reviews.toLocaleString()} reviews</span>
                              <span className="text-gray-500">{c.strategy}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className="text-sm font-bold text-gray-900">{c.price}</p>
                            <p className={`text-xs flex items-center justify-end gap-0.5 ${diff > 0 ? "text-red-500" : diff < 0 ? "text-green-500" : "text-gray-400"}`}>
                              {diff > 0 ? <ArrowUp className="w-3 h-3" /> : diff < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                              {diff !== 0 ? `$${Math.abs(diff).toFixed(2)} vs you` : "Same as you"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* Insights */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">{data.insights.length} Pricing Strategies</h3>
                {data.insights.map((ins, i) => (
                  <Card key={i}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-900">{ins.strategy}</p>
                      <Badge variant={URGENCY_COLORS[ins.urgency]}>{ins.urgency}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="bg-gray-50 rounded-md p-2 text-center">
                        <p className="text-xs text-gray-400">Current</p>
                        <p className="text-sm font-bold text-gray-700">{ins.currentPrice}</p>
                      </div>
                      <div className="bg-blue-50 rounded-md p-2 text-center">
                        <p className="text-xs text-blue-500">Recommended</p>
                        <p className="text-sm font-bold text-blue-700">{ins.recommendedPrice}</p>
                      </div>
                    </div>
                    <p className="text-xs text-green-600 font-medium mb-1">Impact: {ins.potentialRevenueChange}</p>
                    <p className="text-xs text-gray-500">{ins.reason}</p>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
