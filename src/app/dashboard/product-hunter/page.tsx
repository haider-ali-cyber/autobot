"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Star, ChevronUp, ChevronDown, Bookmark, Download } from "lucide-react";

const platforms = ["All", "Amazon", "Shopify", "TikTok Shop"];
const categories = ["All", "Electronics", "Home & Kitchen", "Health", "Beauty", "Sports", "Toys", "Fashion"];

const mockProducts = [
  { name: "Magnetic Wireless Charger Stand", category: "Electronics", platform: "Amazon", price: "$24.99", cost: "$6.20", profit: "$11.80", margin: "47%", demand: 94, competition: 32, score: 96, reviews: 1842, trend: "up", badge: "Hot" },
  { name: "Posture Corrector Back Brace", category: "Health", platform: "Amazon", price: "$19.99", cost: "$4.10", profit: "$9.40", margin: "47%", demand: 88, competition: 41, score: 91, reviews: 3210, trend: "up", badge: "Trending" },
  { name: "LED Ring Light 10 inch", category: "Electronics", platform: "TikTok Shop", price: "$22.99", cost: "$5.50", profit: "$10.80", margin: "47%", demand: 92, competition: 28, score: 93, reviews: 990, trend: "up", badge: "Viral" },
  { name: "Bamboo Cutting Board Set", category: "Home & Kitchen", platform: "Shopify", price: "$34.99", cost: "$8.20", profit: "$16.80", margin: "48%", demand: 76, competition: 55, score: 78, reviews: 2340, trend: "up", badge: "" },
  { name: "Resistance Band Set 5-Pack", category: "Sports", platform: "Amazon", price: "$17.99", cost: "$3.80", profit: "$7.50", margin: "42%", demand: 85, competition: 62, score: 74, reviews: 5610, trend: "down", badge: "" },
  { name: "Neck Massager Pillow", category: "Health", platform: "TikTok Shop", price: "$39.99", cost: "$9.10", profit: "$20.20", margin: "51%", demand: 91, competition: 19, score: 97, reviews: 412, trend: "up", badge: "New Hit" },
  { name: "Stainless Steel Water Bottle", category: "Sports", platform: "Amazon", price: "$21.99", cost: "$5.00", profit: "$9.90", margin: "45%", demand: 79, competition: 71, score: 69, reviews: 8930, trend: "down", badge: "" },
  { name: "Portable Blender USB", category: "Home & Kitchen", platform: "Shopify", price: "$29.99", cost: "$7.40", profit: "$14.20", margin: "47%", demand: 83, competition: 38, score: 84, reviews: 1120, trend: "up", badge: "Rising" },
];

function ProductHunterInner() {
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get("q") ?? "");
  const [platform, setPlatform] = useState("All");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setKeyword(q);
  }, [searchParams]);

  function handleSearch() {
    setLoading(true);
    setTimeout(() => setLoading(false), 900);
  }

  function toggleSave(name: string) {
    setSaved(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  const filtered = mockProducts.filter(p =>
    (platform === "All" || p.platform === platform) &&
    (category === "All" || p.category === category) &&
    (keyword === "" || p.name.toLowerCase().includes(keyword.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Product Research" />
      <main className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* Filters */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Search by product name or niche..."
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <select value={platform} onChange={e => setPlatform(e.target.value)}
                className="bg-gray-100 border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-900 focus:outline-none cursor-pointer">
                {platforms.map(p => <option key={p}>{p}</option>)}
              </select>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="bg-gray-100 border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-900 focus:outline-none cursor-pointer">
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
              <Button onClick={handleSearch} loading={loading} size="sm">
                <Search className="w-3.5 h-3.5" /> Search
              </Button>
            </div>
          </div>
        </Card>

        {/* Results Table */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-gray-900">{filtered.length} results</p>
              {saved.size > 0 && <Badge variant="blue">{saved.size} saved</Badge>}
              <p className="text-xs text-gray-400">Sorted by opportunity score</p>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
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
                  <tr key={p.name} className="hover:bg-gray-50 transition-colors group">
                    <td className="py-3 pr-4">
                      <div>
                        <p className="text-xs font-medium text-gray-900 max-w-[160px] truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.category}</p>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={p.platform === "Amazon" ? "warning" : p.platform === "Shopify" ? "success" : "blue"}>{p.platform}</Badge>
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
                      <button onClick={() => toggleSave(p.name)}
                        className="p-1.5 rounded hover:bg-gray-100 transition-colors cursor-pointer">
                        <Bookmark className={`w-3.5 h-3.5 ${saved.has(p.name) ? "fill-blue-600 text-blue-600" : "text-gray-400"}`} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
