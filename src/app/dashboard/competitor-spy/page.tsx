"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Search, TrendingUp, TrendingDown, Star, DollarSign, Package, Zap, ExternalLink } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const rankHistory = [
  { day: "D-7", rank: 4200 }, { day: "D-6", rank: 3800 }, { day: "D-5", rank: 3100 },
  { day: "D-4", rank: 2700 }, { day: "D-3", rank: 2200 }, { day: "D-2", rank: 1800 }, { day: "D-1", rank: 1240 },
];

const competitors = [
  { name: "Comfier Shiatsu Neck Massager", asin: "B09XLMQQ7W", price: "$39.99", rating: 4.6, reviews: 12430, rank: 1240, sales: "~890/mo", revenue: "~$35.6k/mo", trend: "up", badge: "Market Leader" },
  { name: "RENPHO Neck Massager Pro", asin: "B08NWGQ5TF", price: "$29.99", rating: 4.4, reviews: 8720, rank: 2870, sales: "~620/mo", revenue: "~$18.6k/mo", trend: "up", badge: "" },
  { name: "InvoSpa Neck Pillow Massager", asin: "B07ZJKWW8N", price: "$22.99", rating: 4.2, reviews: 5340, rank: 4190, sales: "~410/mo", revenue: "~$9.4k/mo", trend: "down", badge: "" },
  { name: "Nekteck Neck Massager", asin: "B075FMZ5ZW", price: "$34.99", rating: 4.5, reviews: 9810, rank: 3210, sales: "~540/mo", revenue: "~$18.9k/mo", trend: "up", badge: "Best Value" },
];

const priceHistory = [
  { day: "Oct", price: 42.99 }, { day: "Nov", price: 39.99 }, { day: "Dec", price: 34.99 },
  { day: "Jan", price: 37.99 }, { day: "Feb", price: 39.99 }, { day: "Mar", price: 39.99 },
];

export default function CompetitorSpyPage() {
  const [query, setQuery] = useState("B09XLMQQ7W");
  const [platform, setPlatform] = useState("Amazon");
  const [loading, setLoading] = useState(false);

  function handleSearch() {
    setLoading(true);
    setTimeout(() => setLoading(false), 1200);
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
                placeholder="Enter ASIN, Shopify store URL, or niche keyword..."
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              {["Amazon", "Shopify", "TikTok"].map(p => (
                <button key={p} onClick={() => setPlatform(p)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${platform === p ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                >{p}</button>
              ))}
              <Button onClick={handleSearch} loading={loading} size="sm">
                <Eye className="w-3.5 h-3.5" /> Spy
              </Button>
            </div>
          </div>
        </Card>

        {/* Top Competitor Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Comfier Shiatsu Neck Massager</h3>
                <p className="text-xs text-gray-500 mt-0.5">ASIN: B09XLMQQ7W · Category: Health &amp; Household</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="warning">Market Leader</Badge>
                <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500 cursor-pointer">
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Price", value: "$39.99", icon: DollarSign, color: "text-green-600" },
                { label: "BSR Rank", value: "#1,240", icon: TrendingUp, color: "text-blue-600" },
                { label: "Monthly Sales", value: "~890 units", icon: Package, color: "text-blue-600" },
                { label: "Monthly Revenue", value: "~$35.6k", icon: Zap, color: "text-amber-600" },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-lg p-3">
                  <s.icon className={`w-4 h-4 ${s.color} mb-1`} />
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-sm font-bold text-gray-900">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Price History Chart */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Price History (6 months)</p>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={priceHistory}>
                  <XAxis dataKey="day" stroke="#e5e7eb" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#e5e7eb" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} domain={[30, 45]} />
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
              <LineChart data={rankHistory}>
                <XAxis dataKey="day" stroke="#e5e7eb" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#e5e7eb" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} reversed />
                <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", color: "#111827" }} formatter={(v: unknown) => [`#${(v as number).toLocaleString()}`, "Rank"]} />
                <Line type="monotone" dataKey="rank" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1.5 text-xs">
              {[
                { label: "Review Rating", value: "4.6 ★", color: "text-amber-600" },
                { label: "Total Reviews", value: "12,430", color: "text-gray-500" },
                { label: "Launch Date", value: "Sep 2023", color: "text-gray-500" },
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

        {/* Competitor Table */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Top Competitors in Niche</h3>
            <Badge variant="purple">4 competitors tracked</Badge>
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
              <tbody className="divide-y divide-gray-100/50">
                {competitors.map(c => (
                  <tr key={c.asin} className="hover:bg-gray-100/20">
                    <td className="py-3 pr-4">
                      <p className="text-gray-900 font-medium text-xs truncate max-w-[180px]">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.asin}</p>
                      {c.badge && <Badge variant="success" className="mt-1">{c.badge}</Badge>}
                    </td>
                    <td className="py-3 pr-4 text-green-600 font-semibold">{c.price}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-600" />
                        <span className="text-gray-500">{c.rating}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{c.reviews.toLocaleString()}</td>
                    <td className="py-3 pr-4 text-gray-500">#{c.rank.toLocaleString()}</td>
                    <td className="py-3 pr-4 text-gray-500">{c.sales}</td>
                    <td className="py-3 pr-4 text-blue-600 font-medium">{c.revenue}</td>
                    <td className="py-3">
                      {c.trend === "up" ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
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
