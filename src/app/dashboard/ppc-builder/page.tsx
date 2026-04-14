"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Search, AlertCircle, Target, TrendingUp, DollarSign, ChevronDown, ChevronUp, Copy, CheckCircle } from "lucide-react";

interface PPCKeyword {
  keyword: string;
  matchType: "Exact" | "Phrase" | "Broad";
  suggestedBid: string;
  searchVolume: string;
  competition: "High" | "Medium" | "Low";
  relevance: number;
}

interface AdGroup {
  name: string;
  theme: string;
  keywords: PPCKeyword[];
  suggestedBid: string;
}

interface PPCData {
  product: string;
  campaignName: string;
  campaignType: string;
  budgetPerDay: string;
  targetAcos: string;
  estimatedClicks: string;
  estimatedImpressions: string;
  adGroups: AdGroup[];
  negativeKeywords: string[];
  strategy: string[];
}

const MATCH_COLORS: Record<string, string> = {
  Exact: "bg-blue-50 text-blue-700 border-blue-200",
  Phrase: "bg-purple-50 text-purple-700 border-purple-200",
  Broad: "bg-gray-50 text-gray-700 border-gray-200",
};

const COMP_COLORS: Record<string, string> = {
  High: "text-red-600",
  Medium: "text-amber-600",
  Low: "text-green-600",
};

function exportCSV(data: PPCData) {
  const rows = [["Ad Group", "Keyword", "Match Type", "Suggested Bid", "Search Volume", "Competition", "Relevance"]];
  for (const ag of data.adGroups) {
    for (const kw of ag.keywords) {
      rows.push([ag.name, kw.keyword, kw.matchType, kw.suggestedBid, kw.searchVolume, kw.competition, String(kw.relevance)]);
    }
  }
  const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `ppc-${data.product.replace(/\s+/g, "-")}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function PPCBuilderPage() {
  const [product, setProduct] = useState("");
  const [market, setMarket] = useState("Amazon USA");
  const [budget, setBudget] = useState("20");
  const [campaignType, setCampaignType] = useState("Sponsored Products");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PPCData | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<number>>(new Set([0]));
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    const p = product.trim();
    if (!p) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/ai/ppc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: p, market, budget, campaignType }),
      });
      const json = await res.json() as PPCData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
      setOpenGroups(new Set([0]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  function toggleGroup(i: number) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function copyNegatives() {
    if (!data) return;
    navigator.clipboard.writeText(data.negativeKeywords.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const totalKeywords = data?.adGroups.reduce((s, ag) => s + ag.keywords.length, 0) ?? 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="PPC Campaign Builder" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Config */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={product} onChange={e => setProduct(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGenerate()}
                placeholder='Product e.g. "Neck Massager"'
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <select value={campaignType} onChange={e => setCampaignType(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none cursor-pointer">
              <option>Sponsored Products</option>
              <option>Sponsored Brands</option>
              <option>Sponsored Display</option>
            </select>
            <select value={market} onChange={e => setMarket(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none cursor-pointer">
              <option>Amazon USA</option>
              <option>Amazon UK</option>
              <option>Amazon DE</option>
              <option>Amazon CA</option>
              <option>Amazon AU</option>
            </select>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={budget} onChange={e => setBudget(e.target.value.replace(/\D/g, ""))}
                  placeholder="Daily budget"
                  className="w-full bg-gray-50 border border-gray-200 rounded-md pl-8 pr-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <Button onClick={handleGenerate} loading={loading} size="sm">
                <Zap className="w-3.5 h-3.5" /> Build
              </Button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </div>
          )}
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-gray-500">Building PPC campaign with AI...</span>
          </div>
        )}

        {!loading && !data && !error && (
          <div className="text-center py-16 text-sm text-gray-400">
            Enter a product and click Build to generate a full Amazon PPC campaign structure.
          </div>
        )}

        {!loading && data && (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Campaign", value: data.campaignType, icon: Target, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Daily Budget", value: data.budgetPerDay, icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
                { label: "Target ACoS", value: data.targetAcos, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Est. Clicks/Day", value: data.estimatedClicks, icon: Zap, color: "text-purple-600", bg: "bg-purple-50" },
              ].map(s => (
                <Card key={s.label} className={`flex items-center gap-3 border-0 ${s.bg}`}>
                  <s.icon className={`w-8 h-8 shrink-0 ${s.color}`} />
                  <div className="min-w-0">
                    <p className={`text-lg font-bold truncate ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Ad Groups */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{data.adGroups.length} Ad Groups · {totalKeywords} Keywords</h3>
                  <Button size="sm" variant="secondary" onClick={() => data && exportCSV(data)}>
                    Export CSV
                  </Button>
                </div>

                {data.adGroups.map((ag, i) => (
                  <Card key={i} className="p-0 overflow-hidden">
                    <button
                      onClick={() => toggleGroup(i)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-blue-600 font-bold text-xs">{i + 1}</span>
                        </div>
                        <div className="text-left min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{ag.name}</p>
                          <p className="text-xs text-gray-400 truncate">{ag.theme}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="blue">{ag.keywords.length} kws</Badge>
                        <span className="text-xs text-green-600 font-medium">{ag.suggestedBid}</span>
                        {openGroups.has(i) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>

                    {openGroups.has(i) && (
                      <div className="border-t border-gray-100">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left px-4 py-2 text-gray-500 font-medium">Keyword</th>
                                <th className="text-left px-3 py-2 text-gray-500 font-medium">Match</th>
                                <th className="text-right px-3 py-2 text-gray-500 font-medium">Bid</th>
                                <th className="text-right px-3 py-2 text-gray-500 font-medium">Volume</th>
                                <th className="text-right px-3 py-2 text-gray-500 font-medium">Comp</th>
                                <th className="text-right px-4 py-2 text-gray-500 font-medium">Rel%</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {ag.keywords.map((kw, ki) => (
                                <tr key={ki} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-2.5 font-medium text-gray-900">{kw.keyword}</td>
                                  <td className="px-3 py-2.5">
                                    <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${MATCH_COLORS[kw.matchType] ?? "bg-gray-50 text-gray-600"}`}>{kw.matchType}</span>
                                  </td>
                                  <td className="px-3 py-2.5 text-right text-green-600 font-semibold">{kw.suggestedBid}</td>
                                  <td className="px-3 py-2.5 text-right text-gray-600">{kw.searchVolume}</td>
                                  <td className={`px-3 py-2.5 text-right font-medium ${COMP_COLORS[kw.competition] ?? "text-gray-600"}`}>{kw.competition}</td>
                                  <td className="px-4 py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${kw.relevance}%` }} />
                                      </div>
                                      <span className="text-gray-600 w-7 text-right">{kw.relevance}</span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* Right Panel */}
              <div className="space-y-4">
                {/* Negative Keywords */}
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Negative Keywords</h3>
                    <Button size="sm" variant="secondary" onClick={copyNegatives}>
                      {copied ? <><CheckCircle className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.negativeKeywords.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 bg-red-50 border border-red-100 text-red-600 text-xs rounded-full">{kw}</span>
                    ))}
                  </div>
                </Card>

                {/* Strategy Tips */}
                <Card>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" /> PPC Strategy Tips
                  </h3>
                  <ul className="space-y-2.5">
                    {data.strategy.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">{i + 1}</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* Campaign Info */}
                <Card>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Campaign Summary</h3>
                  <div className="space-y-2">
                    {[
                      { label: "Campaign Name", value: data.campaignName },
                      { label: "Market", value: data.market },
                      { label: "Est. Impressions", value: data.estimatedImpressions },
                    ].map(r => (
                      <div key={r.label} className="flex justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                        <span className="text-gray-500">{r.label}</span>
                        <span className="text-gray-900 font-medium text-right max-w-[55%] truncate">{r.value}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
