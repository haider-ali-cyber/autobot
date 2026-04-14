"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Search, TrendingUp, TrendingDown, Star, DollarSign, Package, Zap, ExternalLink, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface CompetitorProduct {
  asin: string;
  title: string;
  price: string;
  rating: number;
  reviews: number;
  rank: number;
  category: string;
  image: string;
  url: string;
  salesEst: string;
  revenueEst: string;
  trend: "up" | "down";
  badge: string;
  rankHistory: { day: string; rank: number }[];
  priceHistory: { month: string; price: number }[];
}

export default function CompetitorSpyPage() {
  const [query, setQuery] = useState("B09XLMQQ7W");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<CompetitorProduct | null>(null);

  async function handleSearch() {
    const asin = query.trim().toUpperCase();
    if (!asin) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/research/competitor?asin=${encodeURIComponent(asin)}`);
      const data = await res.json() as { product?: CompetitorProduct; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setProduct(data.product ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch competitor data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Competitor Spy" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Search */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Enter Amazon ASIN e.g. B09XLMQQ7W"
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <Button onClick={handleSearch} loading={loading} size="sm">
              <Eye className="w-3.5 h-3.5" /> Spy
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
            <span className="ml-3 text-sm text-gray-500">Fetching competitor data from Amazon...</span>
          </div>
        )}

        {!loading && !product && !error && (
          <div className="text-center py-16 text-sm text-gray-400">
            Enter an Amazon ASIN above and click Spy to get live competitor data.
          </div>
        )}

        {!loading && product && (
          <>
            {/* Product Detail */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Card className="lg:col-span-2">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    {product.image && (
                      <img src={product.image} alt={product.title} className="w-14 h-14 object-contain rounded-lg bg-gray-50 shrink-0" />
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 leading-snug">{product.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">ASIN: {product.asin} · {product.category}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {product.badge && <Badge variant="warning">{product.badge}</Badge>}
                    <a href={product.url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500 cursor-pointer">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Price", value: product.price, icon: DollarSign, color: "text-green-600" },
                    { label: "BSR Rank", value: `#${product.rank.toLocaleString()}`, icon: TrendingUp, color: "text-blue-600" },
                    { label: "Monthly Sales", value: product.salesEst, icon: Package, color: "text-blue-600" },
                    { label: "Monthly Revenue", value: product.revenueEst, icon: Zap, color: "text-amber-600" },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-lg p-3">
                      <s.icon className={`w-4 h-4 ${s.color} mb-1`} />
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className="text-sm font-bold text-gray-900">{s.value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Price History (6 months)</p>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={product.priceHistory}>
                      <XAxis dataKey="month" stroke="#e5e7eb" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#e5e7eb" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                      <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", color: "#111827" }} formatter={(v: unknown) => [`$${v}`, "Price"]} />
                      <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={{ fill: "#2563eb", r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* BSR Rank History */}
              <Card>
                <p className="text-sm font-semibold text-gray-900 mb-2">BSR Rank (Last 7 Days)</p>
                <p className="text-xs text-gray-500 mb-3">Lower = Better</p>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={product.rankHistory}>
                    <XAxis dataKey="day" stroke="#e5e7eb" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#e5e7eb" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} reversed />
                    <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", color: "#111827" }} formatter={(v: unknown) => [`#${(v as number).toLocaleString()}`, "Rank"]} />
                    <Line type="monotone" dataKey="rank" stroke="#22c55e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5 text-xs">
                  {[
                    { label: "Review Rating", value: `${product.rating} ★`, color: "text-amber-600" },
                    { label: "Total Reviews", value: product.reviews.toLocaleString(), color: "text-gray-500" },
                    { label: "Trend", value: product.trend === "up" ? "Improving ↑" : "Declining ↓", color: product.trend === "up" ? "text-green-600" : "text-red-600" },
                    { label: "Seller Type", value: "FBA", color: "text-blue-600" },
                  ].map(i => (
                    <div key={i.label} className="flex justify-between">
                      <span className="text-gray-500">{i.label}</span>
                      <span className={i.color}>{i.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Single product summary table */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Product Overview</h3>
                <Badge variant="blue">Live Data</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {["Product", "Price", "Rating", "Reviews", "BSR", "Est. Sales/mo", "Revenue/mo", "Trend"].map(h => (
                        <th key={h} className="text-left text-xs text-gray-500 pb-2 font-medium pr-4 last:pr-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-gray-100/20">
                      <td className="py-3 pr-4">
                        <p className="text-gray-900 font-medium text-xs truncate max-w-[180px]">{product.title}</p>
                        <p className="text-xs text-gray-400">{product.asin}</p>
                        {product.badge && <Badge variant="success" className="mt-1">{product.badge}</Badge>}
                      </td>
                      <td className="py-3 pr-4 text-green-600 font-semibold">{product.price}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-600" />
                          <span className="text-gray-500">{product.rating}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{product.reviews.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-gray-500">#{product.rank.toLocaleString()}</td>
                      <td className="py-3 pr-4 text-gray-500">{product.salesEst}</td>
                      <td className="py-3 pr-4 text-blue-600 font-medium">{product.revenueEst}</td>
                      <td className="py-3">
                        {product.trend === "up" ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
