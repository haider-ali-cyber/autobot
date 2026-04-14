"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Search, AlertCircle, TrendingUp, TrendingDown, Shield, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

interface RiskFactor { name: string; score: number; level: "Low" | "Medium" | "High" | "Critical"; explanation: string; mitigation: string; }
interface RiskData { product: string; verdict: "Go" | "Caution" | "No-Go"; verdictReason: string; overallRisk: number; riskFactors: RiskFactor[]; opportunities: string[]; threats: string[]; recommendation: string; estimatedProfitPotential: string; timeToProfit: string; }

const RISK_LEVEL = {
  Low: { color: "text-green-600", bg: "bg-green-50", border: "border-green-200", badge: "success" as const },
  Medium: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", badge: "warning" as const },
  High: { color: "text-red-600", bg: "bg-red-50", border: "border-red-200", badge: "danger" as const },
  Critical: { color: "text-red-800", bg: "bg-red-100", border: "border-red-300", badge: "danger" as const },
};

const VERDICT_CONFIG = {
  "Go": { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", border: "border-green-200", label: "✅ GO" },
  "Caution": { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "⚠️ CAUTION" },
  "No-Go": { icon: XCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "❌ NO-GO" },
};

const PLATFORMS = ["Amazon FBA", "Amazon FBM", "Shopify", "TikTok Shop", "Walmart", "eBay"];
const CATEGORIES = ["General", "Electronics", "Health & Beauty", "Home & Kitchen", "Sports & Outdoors", "Clothing", "Toys & Games", "Pet Supplies"];

export default function ProductRiskPage() {
  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("General");
  const [platform, setPlatform] = useState("Amazon FBA");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RiskData | null>(null);

  async function handleAnalyze() {
    const p = product.trim();
    if (!p) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/ai/product-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: p, price, category, platform }),
      });
      const json = await res.json() as RiskData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  }

  const radarData = data?.riskFactors.map(f => ({ name: f.name.split(" ")[0], risk: f.score })) ?? [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Product Risk Analyzer" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={product} onChange={e => setProduct(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAnalyze()}
                placeholder='Product e.g. "Yoga Mat"'
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Sell price e.g. 29.99"
              className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            <select value={platform} onChange={e => setPlatform(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none cursor-pointer">
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
            <Button onClick={handleAnalyze} loading={loading} size="sm">
              <Shield className="w-3.5 h-3.5" /> Analyze Risk
            </Button>
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${category === c ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 text-gray-500 hover:border-blue-300"}`}>
                {c}
              </button>
            ))}
          </div>
          {error && <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</div>}
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-gray-500">Analyzing product risk with AI...</span>
          </div>
        )}

        {!loading && !data && !error && (
          <div className="text-center py-16 text-sm text-gray-400">
            Enter a product to get a full Go / No-Go risk assessment with 5-factor analysis.
          </div>
        )}

        {!loading && data && (() => {
          const vcfg = VERDICT_CONFIG[data.verdict];
          return (
            <>
              {/* Verdict Banner */}
              <div className={`flex items-center gap-4 px-5 py-4 rounded-xl border ${vcfg.bg} ${vcfg.border}`}>
                <vcfg.icon className={`w-8 h-8 ${vcfg.color} shrink-0`} />
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <p className={`text-xl font-black ${vcfg.color}`}>{vcfg.label}</p>
                    <span className="text-sm font-medium text-gray-600">Overall Risk: <span className={`font-bold ${vcfg.color}`}>{data.overallRisk}/100</span></span>
                  </div>
                  <p className="text-sm text-gray-700">{data.verdictReason}</p>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-xs text-gray-400">Profit Potential</p>
                  <p className="text-sm font-bold text-gray-800">{data.estimatedProfitPotential}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Time to profit: {data.timeToProfit}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Radar + Risk Factors */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Radar */}
                  {radarData.length > 0 && (
                    <Card>
                      <p className="text-sm font-semibold text-gray-900 mb-3">Risk Profile</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ResponsiveContainer width="100%" height={200}>
                          <RadarChart data={radarData}>
                            <PolarGrid stroke="#e5e7eb" />
                            <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} />
                            <Radar name="Risk" dataKey="risk" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={1.5} />
                          </RadarChart>
                        </ResponsiveContainer>
                        <div className="space-y-2">
                          {data.riskFactors.map(f => {
                            const cfg = RISK_LEVEL[f.level];
                            return (
                              <div key={f.name} className="flex items-center justify-between">
                                <span className="text-xs text-gray-600 truncate mr-2">{f.name}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${f.score < 30 ? "bg-green-500" : f.score < 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${f.score}%` }} />
                                  </div>
                                  <Badge variant={cfg.badge}>{f.level}</Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Risk Factors Detail */}
                  <div className="space-y-3">
                    {data.riskFactors.map((f, i) => {
                      const cfg = RISK_LEVEL[f.level];
                      return (
                        <Card key={i} className={`border ${cfg.border}`}>
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-sm font-semibold text-gray-900">{f.name}</p>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className={`text-sm font-bold ${cfg.color}`}>{f.score}</span>
                              <Badge variant={cfg.badge}>{f.level}</Badge>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mb-1.5">{f.explanation}</p>
                          <p className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded"><span className="font-medium">Mitigation:</span> {f.mitigation}</p>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Opportunities + Threats + Recommendation */}
                <div className="space-y-4">
                  <Card>
                    <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" /> Opportunities
                    </p>
                    <ul className="space-y-2">
                      {data.opportunities.map((o, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                          <span className="text-green-500 shrink-0 mt-0.5">↑</span> {o}
                        </li>
                      ))}
                    </ul>
                  </Card>

                  <Card>
                    <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-500" /> Threats
                    </p>
                    <ul className="space-y-2">
                      {data.threats.map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                          <span className="text-red-400 shrink-0 mt-0.5">↓</span> {t}
                        </li>
                      ))}
                    </ul>
                  </Card>

                  <Card className="bg-gray-50">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Strategic Recommendation</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{data.recommendation}</p>
                    <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Profit Potential</span>
                        <span className="font-semibold text-gray-700">{data.estimatedProfitPotential}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Time to Profit</span>
                        <span className="font-semibold text-gray-700">{data.timeToProfit}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </>
          );
        })()}
      </main>
    </div>
  );
}
