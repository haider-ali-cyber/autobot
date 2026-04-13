"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Zap, Clock, Flame, Lightbulb } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const trendingProducts = [
  { name: "Stanley Quencher Dupe", niche: "Drinkware", score: 98, stage: "Peak", daysLeft: 14, platforms: ["TikTok", "Amazon"], growth: "+340%", source: "TikTok" },
  { name: "Mini Portable Projector", niche: "Electronics", score: 94, stage: "Rising", daysLeft: 45, platforms: ["TikTok", "Shopify"], growth: "+210%", source: "Reddit" },
  { name: "Collagen Gummies", niche: "Health", score: 91, stage: "Rising", daysLeft: 60, platforms: ["TikTok", "Amazon"], growth: "+180%", source: "TikTok" },
  { name: "Mushroom Coffee", niche: "Health", score: 88, stage: "Early", daysLeft: 90, platforms: ["Amazon", "Shopify"], growth: "+130%", source: "Google Trends" },
  { name: "Silicone Stretch Lids", niche: "Kitchen", score: 85, stage: "Early", daysLeft: 75, platforms: ["Amazon", "TikTok"], growth: "+95%", source: "Pinterest" },
  { name: "Magnetic Eyelashes", niche: "Beauty", score: 82, stage: "Rising", daysLeft: 30, platforms: ["TikTok", "Shopify"], growth: "+160%", source: "Instagram" },
];

const googleTrendData = [
  { week: "W1", stanley: 20, projector: 40, collagen: 60 },
  { week: "W2", stanley: 35, projector: 55, collagen: 68 },
  { week: "W3", stanley: 55, projector: 62, collagen: 72 },
  { week: "W4", stanley: 80, projector: 70, collagen: 78 },
  { week: "W5", stanley: 95, projector: 78, collagen: 82 },
  { week: "W6", stanley: 100, projector: 88, collagen: 88 },
];

const upcomingEvents = [
  { event: "Mother's Day (USA)", date: "May 12", days: 42, products: ["Jewelry", "Skincare", "Candles"] },
  { event: "Memorial Day Sales", date: "May 27", days: 57, products: ["Outdoor", "BBQ", "Sports"] },
  { event: "Amazon Prime Day", date: "Jul 16", days: 107, products: ["Electronics", "Home", "Toys"] },
  { event: "Back to School", date: "Aug 1", days: 123, products: ["Stationery", "Bags", "Tech Accessories"] },
];

const stageColors: Record<string, string> = {
  Peak: "danger",
  Rising: "success",
  Early: "purple",
};

export default function TrendPredictorPage() {
  const [insights, setInsights] = useState<Record<string, string>>({});
  const [insightLoading, setInsightLoading] = useState<Record<string, boolean>>({});

  async function fetchInsight(name: string, niche: string, stage: string, growth: string) {
    setInsightLoading(p => ({ ...p, [name]: true }));
    try {
      const res = await fetch("/api/ai/trend-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName: name, niche, stage, growth }),
      });
      const data = await res.json();
      setInsights(p => ({ ...p, [name]: res.ok ? data.insight : (data.error ?? "Failed to load insight") }));
    } catch {
      setInsights(p => ({ ...p, [name]: "Network error — please retry" }));
    } finally {
      setInsightLoading(p => ({ ...p, [name]: false }));
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Trend Predictor" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Filter Row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2">
            {["All", "TikTok Viral", "Google Trends", "Reddit Hot", "Pinterest"].map(f => (
              <button key={f}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-500 hover:border-blue-500/50 hover:text-blue-600 transition-all cursor-pointer"
              >{f}</button>
            ))}
          </div>
          <Button size="sm" className="ml-auto">
            <Zap className="w-3.5 h-3.5" /> Refresh Trends
          </Button>
        </div>

        {/* Trending Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trendingProducts.map((p) => (
            <Card key={p.name} className="hover:border-blue-200 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <Badge variant={stageColors[p.stage] as "danger" | "success" | "purple"}>{p.stage}</Badge>
                    <Badge variant="outline">{p.niche}</Badge>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">{p.name}</h3>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="text-2xl font-bold text-blue-600">{p.score}</div>
                  <div className="text-xs text-gray-400">Trend Score</div>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
                <span className="flex items-center gap-1 text-green-600 font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" /> {p.growth}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> ~{p.daysLeft} days at peak
                </span>
              </div>

              {/* Trend bar */}
              <div className="mb-3">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${p.score >= 95 ? "bg-red-500" : p.score >= 85 ? "bg-green-500" : "bg-blue-500"}`}
                    style={{ width: `${p.score}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs mb-3">
                <div className="flex gap-1">
                  {p.platforms.map(pl => (
                    <Badge key={pl} variant={pl === "TikTok" ? "blue" : pl === "Amazon" ? "warning" : "success"}>{pl}</Badge>
                  ))}
                </div>
                <span className="text-gray-400">Source: <span className="text-gray-500">{p.source}</span></span>
              </div>

              {insights[p.name] ? (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5" /> AI Insight</p>
                  <p className="text-xs text-blue-600 leading-relaxed">{insights[p.name]}</p>
                </div>
              ) : (
                <button
                  onClick={() => fetchInsight(p.name, p.niche, p.stage, p.growth)}
                  disabled={insightLoading[p.name]}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer disabled:opacity-50"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  {insightLoading[p.name] ? "Analyzing…" : "Get AI Insight"}
                </button>
              )}
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Trend Chart */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Google Trends — Last 6 Weeks</h3>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#2563eb" }} />Stanley Dupe</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#f59e0b" }} />Projector</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#22c55e" }} />Collagen</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={googleTrendData}>
                <XAxis dataKey="week" stroke="#e5e7eb" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#e5e7eb" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", color: "#111827" }} />
                <Line type="monotone" dataKey="stanley" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="projector" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="collagen" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-600" /> Upcoming Sales Events
            </h3>
            <div className="space-y-3">
              {upcomingEvents.map(e => (
                <div key={e.event} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900">{e.event}</p>
                    <Badge variant="warning">{e.days}d</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{e.date}</p>
                  <div className="flex gap-1 flex-wrap">
                    {e.products.map(p => (
                      <span key={p} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{p}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
