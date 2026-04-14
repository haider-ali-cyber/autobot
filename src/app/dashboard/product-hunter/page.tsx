"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Star, ChevronUp, ChevronDown, Bookmark, Download, AlertCircle } from "lucide-react";

const MARKETPLACES = [
  { code: "US", flag: "🇺🇸" }, { code: "UK", flag: "🇬🇧" }, { code: "DE", flag: "🇩🇪" },
  { code: "CA", flag: "🇨🇦" }, { code: "JP", flag: "🇯🇵" }, { code: "AU", flag: "🇦🇺" },
  { code: "IN", flag: "🇮🇳" }, { code: "FR", flag: "🇫🇷" },
];

interface Product {
  asin: string;
  name: string;
  price: string;
  cost: string;
  profit: string;
  margin: string;
  rating: number;
  reviews: number;
  image: string;
  url: string;
  isBestSeller: boolean;
  isAmazonChoice: boolean;
  platform: string;
  demand: number;
  competition: number;
  score: number;
  badge: string;
  trend: "up" | "down";
  category: string;
}

function exportCSV(products: Product[]) {
  const headers = ["Product", "Price", "Cost", "Profit", "Margin", "Score", "Demand", "Competition", "Reviews", "Trend"];
  const rows = products.map(p => [
    `"${p.name.replace(/"/g, '""')}"`, p.price, p.cost, p.profit, p.margin,
    p.score, p.demand, p.competition, p.reviews, p.trend,
  ]);
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "sellora-products.csv";
  a.click();
}

function ProductHunterInner() {
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get("q") ?? "wireless earbuds");
  const [marketplace, setMarketplace] = useState("US");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setKeyword(q);
  }, [searchParams]);

  const fetchProducts = useCallback(async (q: string, mkt = marketplace) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/research/products?q=${encodeURIComponent(q)}&marketplace=${mkt}`);
      const data = await res.json() as { products?: Product[]; fetchedAt?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setProducts(data.products ?? []);
      setFetchedAt(data.fetchedAt ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [marketplace]);

  useEffect(() => {
    fetchProducts(keyword || "wireless earbuds");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch() {
    fetchProducts(keyword || "wireless earbuds");
  }

  function toggleSave(asin: string) {
    setSaved(prev => {
      const next = new Set(prev);
      if (next.has(asin)) next.delete(asin); else next.add(asin);
      return next;
    });
  }

  const filtered = products;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Product Research" />
      <main className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* Filters */}
        <Card>
          <div className="flex gap-1.5 flex-wrap mb-3">
            {MARKETPLACES.map(m => (
              <button key={m.code}
                onClick={() => { setMarketplace(m.code); fetchProducts(keyword || "wireless earbuds", m.code); }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  marketplace === m.code ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 text-gray-500 hover:border-blue-300"
                }`}>
                {m.flag} {m.code}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Search products (e.g. neck massager)..."
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <Button onClick={handleSearch} loading={loading} size="sm">
              <Search className="w-3.5 h-3.5" /> Search
            </Button>
          </div>
        </Card>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Results Table */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-gray-900">{loading ? "Loading..." : `${filtered.length} results`}</p>
              {saved.size > 0 && <Badge variant="blue">{saved.size} saved</Badge>}
              {fetchedAt && <p className="text-xs text-gray-400">Live from Amazon</p>}
            </div>
            {filtered.length > 0 && (
              <button onClick={() => exportCSV(filtered)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-sm text-gray-500">Fetching live Amazon data...</span>
            </div>
          ) : filtered.length === 0 && !error ? (
            <div className="text-center py-16 text-sm text-gray-400">No products found. Try a different keyword.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Product", "Platform", "Score", "Price", "Est. Profit", "Margin", "Demand", "Competition", "Reviews", "Trend", ""].map(h => (
                      <th key={h} className="text-left text-xs text-gray-400 font-medium pb-2.5 pr-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(p => (
                    <tr key={p.asin} className="hover:bg-gray-50 transition-colors group">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          {p.image && (
                            <img src={p.image} alt={p.name} className="w-8 h-8 object-contain rounded shrink-0 bg-gray-50" />
                          )}
                          <div>
                            <a href={p.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs font-medium text-gray-900 max-w-[140px] truncate block hover:text-blue-600 transition-colors">{p.name}</a>
                            <p className="text-xs text-gray-400">{p.isBestSeller ? "Best Seller" : p.isAmazonChoice ? "Amazon Choice" : "Amazon"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="warning">{p.platform}</Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${
                            p.score >= 90 ? "text-green-600" : p.score >= 75 ? "text-amber-600" : "text-red-500"
                          }`}>{p.score}</span>
                          {p.badge && <Badge variant={p.score >= 90 ? "success" : "warning"}>{p.badge}</Badge>}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-900">{p.price}</td>
                      <td className="py-3 pr-4 text-xs text-green-600 font-medium">{p.profit}</td>
                      <td className="py-3 pr-4 text-xs text-gray-500">{p.margin}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 bg-gray-100 rounded-full">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p.demand}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{p.demand}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-medium ${
                          p.competition < 40 ? "text-green-600" : p.competition < 65 ? "text-amber-600" : "text-red-600"
                        }`}>{p.competition < 40 ? "Low" : p.competition < 65 ? "Med" : "High"}</span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-500" />
                          {p.reviews.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        {p.trend === "up"
                          ? <ChevronUp className="w-4 h-4 text-green-600" />
                          : <ChevronDown className="w-4 h-4 text-red-600" />}
                      </td>
                      <td className="py-3">
                        <button onClick={() => toggleSave(p.asin)}
                          className="p-1.5 rounded hover:bg-gray-100 transition-colors cursor-pointer">
                          <Bookmark className={`w-3.5 h-3.5 ${saved.has(p.asin) ? "fill-blue-600 text-blue-600" : "text-gray-400"}`} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}

export default function ProductHunterPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Product Research" />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    }>
      <ProductHunterInner />
    </Suspense>
  );
}
