"use client";
import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Zap, Clock, Flame, Lightbulb, AlertCircle, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface TrendingProduct {
  name: string;
  niche: string;
  score: number;
  stage: string;
  daysLeft: number;
  platforms: string[];
  growth: string;
  source: string;
  whyTrending?: string;
}

interface UpcomingEvent {
  event: string;
  date: string;
  days: number;
  products: string[];
}

interface TrendData {
  products: TrendingProduct[];
  trendData: Record<string, string | number>[];
  upcomingEvents: UpcomingEvent[];
  generatedAt: string;
}

const stageColors: Record<string, "danger" | "success" | "purple"> = {
  Peak: "danger",
  Rising: "success",
  Early: "purple",
};

const lineColors = ["#2563eb", "#f59e0b", "#22c55e"];
const NICHES = ["ecommerce dropshipping", "Health & Beauty", "Home & Kitchen", "Electronics", "Fitness & Sports", "Pet Supplies"];

export default function TrendPredictorPage() {
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [niche, setNiche] = useState("ecommerce dropshipping");
  const [insights, setInsights] = useState<Record<string, string>>({});
  const [insightLoading, setInsightLoading] = useState<Record<string, boolean>>({});

  async function fetchTrends(refresh = false) {
    setLoading(true);
    setError(null);
    setInsights({});
    try {
      const res = await fetch("/api/ai/trending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, refresh }),
      });
      const data = await res.json() as TrendData & { error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setTrendData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch trends");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTrends(); }, []);

  async function fetchInsight(name: string, niche: string, stage: string, growth: string) {
    setInsightLoading(p => ({ ...p, [name]: true }));
    try {
      const res = await fetch("/api/ai/trend-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName: name, niche, stage, growth }),
      });
      const data = await res.json() as { insight?: string; error?: string };
      setInsights(p => ({ ...p, [name]: res.ok ? (data.insight ?? "") : (data.error ?? "Failed") }));
    } catch {
      setInsights(p => ({ ...p, [name]: "Network error — please retry" }));
    } finally {
      setInsightLoading(p => ({ ...p, [name]: false }));
    }
  }

  const products = trendData?.products ?? [];
  const chartData = trendData?.trendData ?? [];
  const upcomingEvents = trendData?.upcomingEvents ?? [];
  const top3 = products.slice(0, 3);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Trend Predictor" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Filter Row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {NICHES.map(n => (
              <button key={n} onClick={() => setNiche(n)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${niche === n ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 text-gray-500 hover:border-blue-500/50 hover:text-blue-600"}`}
              >{n}</button>
            ))}
          </div>
          <Button size="sm" className="ml-auto" onClick={() => fetchTrends(true)} loading={loading}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Trends
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-gray-500">Generating AI trend analysis...</span>
          </div>
        )}

        {!loading && products.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => (
                <Card key={p.name} className="hover:border-blue-200 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <Badge variant={stageColors[p.stage] ?? "outline"}>{p.stage}</Badge>
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

                  <div className="mb-3">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${p.score >= 95 ? "bg-red-500" : p.score >= 85 ? "bg-green-500" : "bg-blue-500"}`}
                        style={{ width: `${p.score}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs mb-3">
                    <div className="flex gap-1 flex-wrap">
                      {p.platforms.map(pl => (
                        <Badge key={pl} variant={pl === "TikTok" ? "blue" : pl === "Amazon" ? "warning" : "success"}>{pl}</Badge>
                      ))}
                    </div>
                    <span className="text-gray-400 shrink-0 ml-1">via {p.source}</span>
                  </div>

                  {p.whyTrending && !insights[p.name] && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 mb-2">
                      <p className="text-xs text-blue-600 leading-relaxed">{p.whyTrending}</p>
                    </div>
                  )}

                  {insights[p.name] ? (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                      <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5" /> AI Insight</p>
                      <p className="text-xs text-blue-600 leading-relaxed">{insights[p.name]}</p>
                    </div>
                  ) : (
                    <button onClick={() => fetchInsight(p.name, p.niche, p.stage, p.growth)}
                      disabled={insightLoading[p.name]}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer disabled:opacity-50">
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
                  <h3 className="text-sm font-semibold text-gray-900">Trend Growth — Last 6 Weeks (AI Analysis)</h3>
                  <div className="flex gap-3 text-xs flex-wrap">
                    {top3.map((p, i) => (
                      <span key={p.name} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: lineColors[i] }} />
                        {p.name.length > 18 ? p.name.slice(0, 18) + "…" : p.name}
                      </span>
                    ))}
                  </div>
                </div>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <XAxis dataKey="week" stroke="#e5e7eb" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#e5e7eb" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", color: "#111827" }} />
                      <Line type="monotone" dataKey="p1" stroke={lineColors[0]} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="p2" stroke={lineColors[1]} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="p3" stroke={lineColors[2]} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-sm text-gray-400">No chart data available</div>
                )}
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
          </>
        )}
      </main>
    </div>
  );
}
