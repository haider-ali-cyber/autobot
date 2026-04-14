"use client";
import { useState, useCallback, useRef } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, TrendingDown, Zap, Copy, CheckCheck, AlertCircle, Download, Globe, ChevronUp, ChevronDown, Layers, Flame } from "lucide-react";

const MARKETPLACES = [
  { code: "US", flag: "🇺🇸", label: "amazon.com" },
  { code: "UK", flag: "🇬🇧", label: "amazon.co.uk" },
  { code: "DE", flag: "🇩🇪", label: "amazon.de" },
  { code: "CA", flag: "🇨🇦", label: "amazon.ca" },
  { code: "JP", flag: "🇯🇵", label: "amazon.co.jp" },
  { code: "AU", flag: "🇦🇺", label: "amazon.com.au" },
  { code: "IN", flag: "🇮🇳", label: "amazon.in" },
  { code: "FR", flag: "🇫🇷", label: "amazon.fr" },
];

function exportKeywordsCSV(keywords: Keyword[]) {
  const rows = [["Keyword", "Volume", "Difficulty", "Opportunity", "CPC", "Competition", "Intent", "Trend", "Platform"]];
  keywords.forEach(k => rows.push([`"${k.keyword}"`, String(k.volume), String(k.difficulty), String(k.opportunityScore), k.cpc, k.competition, k.intent, k.trend, k.platform]));
  const csv = rows.map(r => r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "sellora-keywords.csv"; a.click();
}

function buildClusters(keywords: Keyword[]): Record<string, Keyword[]> {
  const clusters: Record<string, Keyword[]> = {};
  keywords.forEach(kw => {
    const words = kw.keyword.toLowerCase().split(/\s+/);
    const key = words.slice(0, 2).join(" ");
    if (!clusters[key]) clusters[key] = [];
    clusters[key].push(kw);
  });
  return clusters;
}

interface Keyword {
  keyword: string;
  volume: number;
  cpc: string;
  competition: string;
  trend: string;
  difficulty: number;
  platform: string;
  intent: "Transactional" | "Commercial" | "Informational";
  opportunityScore: number;
}

interface AsinProduct {
  asin: string;
  title: string;
  price: string;
  rating: number;
  reviews: number;
}

const INTENT_COLORS = {
  Transactional: "bg-green-100 text-green-700",
  Commercial: "bg-blue-100 text-blue-700",
  Informational: "bg-gray-100 text-gray-600",
};

type SortKey = "volume" | "difficulty" | "opportunityScore" | "cpc";

export default function KeywordResearchPage() {
  const [query, setQuery] = useState("neck massager");
  const [marketplace, setMarketplace] = useState("US");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [intentFilter, setIntentFilter] = useState<string>("All");
  const [sortKey, setSortKey] = useState<SortKey>("opportunityScore");
  const [sortAsc, setSortAsc] = useState(false);
  const [view, setView] = useState<"table" | "clusters">("table");

  const asinRef = useRef<HTMLInputElement>(null);
  const [asinLoading, setAsinLoading] = useState(false);
  const [asinError, setAsinError] = useState<string | null>(null);
  const [asinProduct, setAsinProduct] = useState<AsinProduct | null>(null);
  const [asinKeywords, setAsinKeywords] = useState<Keyword[]>([]);

  const diffColor = (d: number) => d < 30 ? "text-green-600" : d < 55 ? "text-amber-600" : "text-red-600";
  const oppColor = (s: number) => s >= 70 ? "text-green-600 font-bold" : s >= 45 ? "text-amber-600 font-semibold" : "text-gray-400";

  const fetchKeywords = useCallback(async (q: string, mkt = marketplace) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/research/keywords?q=${encodeURIComponent(q)}&marketplace=${mkt}`);
      const data = await res.json() as { keywords?: Keyword[]; fetchedAt?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setKeywords(data.keywords ?? []);
      setFetchedAt(data.fetchedAt ?? null);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  }, [marketplace]);

  async function fetchAsinKeywords() {
    const asin = asinRef.current?.value?.trim().toUpperCase();
    if (!asin) return;
    setAsinLoading(true); setAsinError(null); setAsinProduct(null); setAsinKeywords([]);
    try {
      const res = await fetch(`/api/research/competitor?asin=${encodeURIComponent(asin)}`);
      const data = await res.json() as { product?: { asin: string; title: string; price: string; rating: number; reviews: number }; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      if (data.product) {
        setAsinProduct({ asin: data.product.asin, title: data.product.title, price: data.product.price, rating: data.product.rating, reviews: data.product.reviews });
        const kwRes = await fetch(`/api/research/keywords?q=${encodeURIComponent(data.product.title.split(" ").slice(0, 4).join(" "))}&marketplace=${marketplace}`);
        const kwData = await kwRes.json() as { keywords?: Keyword[] };
        setAsinKeywords(kwData.keywords ?? []);
      }
    } catch (err) { setAsinError(err instanceof Error ? err.message : "Failed"); }
    finally { setAsinLoading(false); }
  }

  function handleCopy(kw: string) { navigator.clipboard.writeText(kw); setCopied(kw); setTimeout(() => setCopied(null), 1500); }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  const filtered = keywords.filter(k => intentFilter === "All" || k.intent === intentFilter);
  const sorted = [...filtered].sort((a, b) => {
    let av: number, bv: number;
    if (sortKey === "cpc") { av = parseFloat(a.cpc.replace(/[^0-9.]/g, "")); bv = parseFloat(b.cpc.replace(/[^0-9.]/g, "")); }
    else { av = a[sortKey] as number; bv = b[sortKey] as number; }
    return sortAsc ? av - bv : bv - av;
  });

  const clusters = buildClusters(keywords);
  const lowComp = keywords.filter(k => k.competition === "Low").length;
  const totalVol = keywords.reduce((s, k) => s + k.volume, 0);
  const avgCpc = keywords.length ? (keywords.reduce((s, k) => s + parseFloat(k.cpc.replace(/[^0-9.]/g, "")), 0) / keywords.length).toFixed(2) : "0.00";
  const topOpportunity = [...keywords].sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 3);

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-gray-300 inline ml-0.5" />;
    return sortAsc ? <ChevronUp className="w-3 h-3 text-blue-500 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 text-blue-500 inline ml-0.5" />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Keyword Research" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Search + Marketplace */}
        <Card>
          <div className="flex gap-2 flex-wrap mb-3">
            {MARKETPLACES.map(m => (
              <button key={m.code} onClick={() => { setMarketplace(m.code); if (keywords.length > 0) fetchKeywords(query, m.code); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${marketplace === m.code ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 text-gray-500 hover:border-blue-300"}`}>
                <span>{m.flag}</span> {m.code}
              </button>
            ))}
          </div>
          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && fetchKeywords(query)}
                placeholder='Seed keyword e.g. "yoga mat", "phone case"'
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <Button onClick={() => fetchKeywords(query)} loading={loading} size="sm">
              <Zap className="w-3.5 h-3.5" /> Research
            </Button>
          </div>
          {error && <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</div>}

          {keywords.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
              {[
                { label: "Keywords", value: String(keywords.length), color: "text-blue-600" },
                { label: "Total Volume", value: totalVol > 1000 ? `${(totalVol / 1000).toFixed(0)}K` : String(totalVol), color: "text-blue-600" },
                { label: "Low Competition", value: String(lowComp), color: "text-green-600" },
                { label: "Avg. CPC", value: `$${avgCpc}`, color: "text-amber-600" },
                { label: "Top Opportunity", value: `${topOpportunity[0]?.opportunityScore ?? 0}/100`, color: "text-purple-600" },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top Opportunity Banner */}
        {topOpportunity.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex-wrap">
            <Flame className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs font-semibold text-amber-800 mr-2">🔥 Top Opportunities:</p>
            {topOpportunity.map(k => (
              <span key={k.keyword} className="px-2.5 py-1 bg-white border border-amber-200 rounded-full text-xs text-amber-700 font-medium">
                {k.keyword} <span className="text-amber-500 font-bold">{k.opportunityScore}</span>
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Table */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {["All", "Transactional", "Commercial", "Informational"].map(f => (
                  <button key={f} onClick={() => setIntentFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${intentFilter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-800"}`}>{f}</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setView(v => v === "table" ? "clusters" : "table")}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                  <Layers className="w-3.5 h-3.5" /> {view === "table" ? "Clusters" : "Table"}
                </button>
                {keywords.length > 0 && (
                  <button onClick={() => exportKeywordsCSV(keywords)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                    <Download className="w-3.5 h-3.5" /> CSV
                  </button>
                )}
                {fetchedAt && <Badge variant="success">{sorted.length} · Live</Badge>}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="ml-2 text-sm text-gray-500">Fetching keyword data...</span>
              </div>
            ) : keywords.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400">Enter a keyword and click Research to get live data.</div>
            ) : view === "clusters" ? (
              <div className="space-y-3">
                {Object.entries(clusters).map(([cluster, kws]) => (
                  <div key={cluster} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <Layers className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-semibold text-gray-700 capitalize">{cluster}</span>
                      <span className="text-xs text-gray-400">({kws.length} keywords)</span>
                    </div>
                    {kws.map(kw => (
                      <div key={kw.keyword} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="text-xs font-medium text-gray-800">{kw.keyword}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${INTENT_COLORS[kw.intent]}`}>{kw.intent}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{kw.volume.toLocaleString()}</span>
                          <span className={diffColor(kw.difficulty)}>{kw.difficulty}</span>
                          <span className={oppColor(kw.opportunityScore)}>{kw.opportunityScore}</span>
                          <button onClick={() => handleCopy(kw.keyword)} className="p-1 hover:bg-gray-200 rounded cursor-pointer">
                            {copied === kw.keyword ? <CheckCheck className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-xs text-gray-500 pb-2 font-medium">Keyword</th>
                      <th className="text-right text-xs text-gray-500 pb-2 font-medium cursor-pointer hover:text-blue-600 select-none" onClick={() => toggleSort("volume")}>Vol <SortIcon col="volume" /></th>
                      <th className="text-right text-xs text-gray-500 pb-2 font-medium cursor-pointer hover:text-blue-600 select-none" onClick={() => toggleSort("difficulty")}>Diff <SortIcon col="difficulty" /></th>
                      <th className="text-right text-xs text-gray-500 pb-2 font-medium cursor-pointer hover:text-blue-600 select-none" onClick={() => toggleSort("opportunityScore")}>Opp <SortIcon col="opportunityScore" /></th>
                      <th className="text-right text-xs text-gray-500 pb-2 font-medium cursor-pointer hover:text-blue-600 select-none" onClick={() => toggleSort("cpc")}>CPC <SortIcon col="cpc" /></th>
                      <th className="text-center text-xs text-gray-500 pb-2 font-medium">Comp</th>
                      <th className="text-center text-xs text-gray-500 pb-2 font-medium">Intent</th>
                      <th className="text-center text-xs text-gray-500 pb-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/50">
                    {sorted.map(kw => (
                      <tr key={kw.keyword} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-2.5 pr-3">
                          <p className="text-gray-900 font-medium">{kw.keyword}</p>
                          <p className="text-xs text-gray-400">{kw.platform}</p>
                        </td>
                        <td className="text-right py-2.5 text-gray-500 text-xs">{kw.volume.toLocaleString()}</td>
                        <td className={`text-right py-2.5 font-semibold text-xs ${diffColor(kw.difficulty)}`}>{kw.difficulty}</td>
                        <td className={`text-right py-2.5 text-xs ${oppColor(kw.opportunityScore)}`}>{kw.opportunityScore}</td>
                        <td className="text-right py-2.5 text-gray-500 text-xs">{kw.cpc}</td>
                        <td className="text-center py-2.5">
                          <Badge variant={kw.competition === "Low" ? "success" : kw.competition === "Medium" ? "warning" : "danger"}>{kw.competition}</Badge>
                        </td>
                        <td className="text-center py-2.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${INTENT_COLORS[kw.intent as keyof typeof INTENT_COLORS] ?? ""}`}>{kw.intent}</span>
                        </td>
                        <td className="text-center py-2.5">
                          <button onClick={() => handleCopy(kw.keyword)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">
                            {copied === kw.keyword ? <CheckCheck className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Reverse ASIN */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Reverse ASIN Lookup</h3>
            <p className="text-xs text-gray-500 mb-3">Steal competitor keywords — includes intent & opportunity</p>
            <input ref={asinRef} placeholder="Enter ASIN e.g. B09XLMQQ7W"
              className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 mb-2"
            />
            <Button size="sm" className="w-full mb-4" variant="secondary" onClick={fetchAsinKeywords} loading={asinLoading}>
              <Search className="w-3.5 h-3.5" /> Find Keywords
            </Button>
            {asinError && <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{asinError}</div>}
            {asinProduct && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-medium text-gray-900 truncate">{asinProduct.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{asinProduct.asin} · {asinProduct.price}</p>
                <p className="text-xs text-gray-500 mt-1">⭐ {asinProduct.rating} · {asinProduct.reviews.toLocaleString()} reviews</p>
              </div>
            )}
            {asinKeywords.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Keywords Found</p>
                {asinKeywords.slice(0, 6).map(k => (
                  <div key={k.keyword} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="min-w-0 mr-2">
                      <p className="text-xs font-medium text-gray-900 truncate max-w-[130px]">{k.keyword}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-gray-400">{k.volume.toLocaleString()}</span>
                        <span className={`text-[10px] px-1 py-0.5 rounded ${INTENT_COLORS[k.intent as keyof typeof INTENT_COLORS] ?? ""}`}>{k.intent.slice(0, 4)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs font-bold ${oppColor(k.opportunityScore)}`}>{k.opportunityScore}</span>
                      <button onClick={() => handleCopy(k.keyword)} className="p-1 rounded hover:bg-gray-200 cursor-pointer">
                        {copied === k.keyword ? <CheckCheck className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!asinProduct && !asinLoading && asinKeywords.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Enter an Amazon ASIN to steal competitor keywords</p>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
