"use client";
import { useState, useCallback, useRef } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, TrendingDown, Zap, Copy, CheckCheck, AlertCircle, Download } from "lucide-react";

function exportKeywordsCSV(keywords: { keyword: string; volume: number; cpc: string; competition: string; trend: string; difficulty: number; platform: string }[]) {
  const rows = [["Keyword", "Volume", "Difficulty", "CPC", "Competition", "Trend", "Platform"]];
  keywords.forEach(k => rows.push([`"${k.keyword}"`, String(k.volume), String(k.difficulty), k.cpc, k.competition, k.trend, k.platform]));
  const csv = rows.map(r => r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "sellora-keywords.csv"; a.click();
}

interface Keyword {
  keyword: string;
  volume: number;
  cpc: string;
  competition: string;
  trend: string;
  difficulty: number;
  platform: string;
}

interface AsinProduct {
  asin: string;
  title: string;
  price: string;
  rating: number;
  reviews: number;
}

export default function KeywordResearchPage() {
  const [query, setQuery] = useState("neck massager");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const asinRef = useRef<HTMLInputElement>(null);
  const [asinLoading, setAsinLoading] = useState(false);
  const [asinError, setAsinError] = useState<string | null>(null);
  const [asinProduct, setAsinProduct] = useState<AsinProduct | null>(null);
  const [asinKeywords, setAsinKeywords] = useState<Keyword[]>([]);

  const diffColor = (d: number) =>
    d < 30 ? "text-green-600" : d < 55 ? "text-amber-600" : "text-red-600";

  const fetchKeywords = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/research/keywords?q=${encodeURIComponent(q)}`);
      const data = await res.json() as { keywords?: Keyword[]; fetchedAt?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setKeywords(data.keywords ?? []);
      setFetchedAt(data.fetchedAt ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch keywords");
    } finally {
      setLoading(false);
    }
  }, []);

  async function fetchAsinKeywords() {
    const asin = asinRef.current?.value?.trim().toUpperCase();
    if (!asin) return;
    setAsinLoading(true);
    setAsinError(null);
    setAsinProduct(null);
    setAsinKeywords([]);
    try {
      const res = await fetch(`/api/research/competitor?asin=${encodeURIComponent(asin)}`);
      const data = await res.json() as { product?: { asin: string; title: string; price: string; rating: number; reviews: number }; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      if (data.product) {
        setAsinProduct({ asin: data.product.asin, title: data.product.title, price: data.product.price, rating: data.product.rating, reviews: data.product.reviews });
        const kwRes = await fetch(`/api/research/keywords?q=${encodeURIComponent(data.product.title.split(" ").slice(0, 4).join(" "))}`);
        const kwData = await kwRes.json() as { keywords?: Keyword[] };
        setAsinKeywords(kwData.keywords ?? []);
      }
    } catch (err) {
      setAsinError(err instanceof Error ? err.message : "Failed to lookup ASIN");
    } finally {
      setAsinLoading(false);
    }
  }

  function handleCopy(kw: string) {
    navigator.clipboard.writeText(kw);
    setCopied(kw);
    setTimeout(() => setCopied(null), 1500);
  }

  const lowComp = keywords.filter(k => k.competition === "Low").length;
  const totalVol = keywords.reduce((s, k) => s + k.volume, 0);
  const avgCpc = keywords.length
    ? (keywords.reduce((s, k) => s + parseFloat(k.cpc.replace("$", "")), 0) / keywords.length).toFixed(2)
    : "0.00";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Keyword Research" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Search */}
        <Card>
          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && fetchKeywords(query)}
                placeholder='Enter seed keyword e.g. "yoga mat", "phone case"'
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => fetchKeywords(query)} loading={loading} size="sm">
                <Zap className="w-3.5 h-3.5" /> Research
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </div>
          )}

          {keywords.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                { label: "Keywords Found", value: String(keywords.length), color: "text-blue-600" },
                { label: "Total Search Vol.", value: totalVol > 1000 ? `${(totalVol / 1000).toFixed(0)}K` : String(totalVol), color: "text-blue-600" },
                { label: "Low Competition", value: String(lowComp), color: "text-green-600" },
                { label: "Avg. CPC", value: `$${avgCpc}`, color: "text-amber-600" },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Keyword Table */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Keyword Results</h3>
              <div className="flex items-center gap-2">
                {fetchedAt && <Badge variant="success">{keywords.length} keywords · Live</Badge>}
                {keywords.length > 0 && (
                  <button onClick={() => exportKeywordsCSV(keywords)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
                    <Download className="w-3.5 h-3.5" /> CSV
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="ml-2 text-sm text-gray-500">Fetching keyword data...</span>
              </div>
            ) : keywords.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400">
                Enter a keyword and click Research to get live Amazon data.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-xs text-gray-500 pb-2 font-medium">Keyword</th>
                      <th className="text-right text-xs text-gray-500 pb-2 font-medium">Volume</th>
                      <th className="text-right text-xs text-gray-500 pb-2 font-medium">Difficulty</th>
                      <th className="text-right text-xs text-gray-500 pb-2 font-medium">CPC</th>
                      <th className="text-center text-xs text-gray-500 pb-2 font-medium">Competition</th>
                      <th className="text-center text-xs text-gray-500 pb-2 font-medium">Trend</th>
                      <th className="text-center text-xs text-gray-500 pb-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/50">
                    {keywords.map(kw => (
                      <tr key={kw.keyword} className="hover:bg-gray-100/20 transition-colors">
                        <td className="py-2.5 pr-3">
                          <p className="text-gray-900 font-medium">{kw.keyword}</p>
                          <p className="text-xs text-gray-400">{kw.platform}</p>
                        </td>
                        <td className="text-right py-2.5 text-gray-500">{kw.volume.toLocaleString()}</td>
                        <td className={`text-right py-2.5 font-semibold ${diffColor(kw.difficulty)}`}>{kw.difficulty}</td>
                        <td className="text-right py-2.5 text-gray-500">{kw.cpc}</td>
                        <td className="text-center py-2.5">
                          <Badge variant={kw.competition === "Low" ? "success" : kw.competition === "Medium" ? "warning" : "danger"}>
                            {kw.competition}
                          </Badge>
                        </td>
                        <td className="text-center py-2.5">
                          {kw.trend === "up"
                            ? <TrendingUp className="w-4 h-4 text-green-600 inline" />
                            : <TrendingDown className="w-4 h-4 text-red-600 inline" />}
                        </td>
                        <td className="text-center py-2.5">
                          <button onClick={() => handleCopy(kw.keyword)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">
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
            <p className="text-xs text-gray-500 mb-3">Steal competitor keywords</p>
            <input ref={asinRef} placeholder="Enter ASIN e.g. B09XLMQQ7W"
              className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 mb-2"
            />
            <Button size="sm" className="w-full mb-4" variant="secondary" onClick={fetchAsinKeywords} loading={asinLoading}>
              <Search className="w-3.5 h-3.5" /> Find Keywords
            </Button>

            {asinError && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{asinError}
              </div>
            )}

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
                {asinKeywords.slice(0, 5).map(k => (
                  <div key={k.keyword} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <p className="text-xs font-medium text-gray-900 truncate max-w-[140px]">{k.keyword}</p>
                      <p className="text-xs text-gray-400">{k.volume.toLocaleString()} vol</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={k.competition === "Low" ? "success" : k.competition === "Medium" ? "warning" : "danger"}>{k.competition}</Badge>
                      <button onClick={() => handleCopy(k.keyword)} className="p-1 rounded hover:bg-gray-200 cursor-pointer">
                        {copied === k.keyword ? <CheckCheck className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!asinProduct && !asinLoading && asinKeywords.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Enter an Amazon ASIN to find competitor keywords</p>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
