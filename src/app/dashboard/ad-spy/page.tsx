"use client";
import { useState, useRef, useCallback } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, Search, Play, Heart, Eye, TrendingUp, Zap, Copy, CheckCheck, AlertCircle, ExternalLink } from "lucide-react";

interface SpyAd {
  id: string;
  brand: string;
  product: string;
  body: string;
  views: string;
  likes: number;
  shares: number;
  spend: string;
  days: number;
  platform: string;
  angle: string;
  score: number;
  snapshotUrl: string;
}

export default function AdSpyPage() {
  const [platform, setPlatform] = useState("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ads, setAds] = useState<SpyAd[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const productRef = useRef<HTMLInputElement>(null);
  const formatRef = useRef<HTMLSelectElement>(null);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [scripts, setScripts] = useState<string[]>([]);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  }

  const fetchAds = useCallback(async (q: string, plat: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (plat && plat !== "All") params.set("platform", plat.toLowerCase());
      const res = await fetch(`/api/research/ad-spy?${params.toString()}`);
      const data = await res.json() as { ads?: SpyAd[]; fetchedAt?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setAds(data.ads ?? []);
      setFetchedAt(data.fetchedAt ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch ads");
    } finally {
      setLoading(false);
    }
  }, []);

  async function generateScripts() {
    const product = productRef.current?.value?.trim();
    const format = formatRef.current?.value ?? "TikTok Hook Script";
    if (!product) return;
    setScriptLoading(true);
    setScriptError(null);
    try {
      const res = await fetch("/api/ai/ad-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, format }),
      });
      const data = await res.json() as { scripts?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      if (data.scripts && data.scripts.length > 0) setScripts(data.scripts);
    } catch (err) {
      setScriptError(err instanceof Error ? err.message : "Failed to generate scripts");
    } finally {
      setScriptLoading(false);
    }
  }

  function handleSpy() {
    fetchAds(query, platform);
  }

  const angleStats = ads.length > 0
    ? Object.entries(
        ads.reduce<Record<string, number>>((acc, ad) => { acc[ad.angle] = (acc[ad.angle] ?? 0) + 1; return acc; }, {})
      ).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : [
        ["Pain Story / Relatable", 78], ["Before/After Demo", 65],
        ["ASMR / Satisfying", 54], ["Influencer UGC", 48], ["Problem/Solution", 42],
      ];

  const angleColors = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-amber-500", "bg-pink-500"];
  const maxAngle = Math.max(...angleStats.map(([, v]) => v as number));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Ad Spy" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Search */}
        <Card>
          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSpy()}
                placeholder="Search by product or keyword e.g. neck massager..."
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {["All", "Facebook", "Instagram"].map(p => (
                <button key={p} onClick={() => setPlatform(p)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${platform === p ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                >{p}</button>
              ))}
              <Button onClick={handleSpy} loading={loading} size="sm">
                <Zap className="w-3.5 h-3.5" /> Spy
              </Button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Ad Cards */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">
                <span className="text-gray-900 font-semibold">{ads.length}</span> ads found
                {fetchedAt && <span className="text-blue-600 ml-1">· Live</span>}
              </p>
              {ads.length > 0 && <Badge variant="success">Sorted by Performance</Badge>}
            </div>

            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-sm text-gray-500">Fetching live ads from Meta...</span>
              </div>
            )}

            {!loading && ads.length === 0 && !error && (
              <div className="text-center py-16 text-sm text-gray-400">
                Enter a keyword and click Spy to fetch real Facebook/Instagram ads.
              </div>
            )}

            {!loading && ads.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ads.map((ad, i) => (
                  <Card key={ad.id ?? i} className="hover:border-blue-200 transition-colors">
                    <div className="relative bg-linear-to-br from-[#21262d] to-[#0d1117] rounded-md h-32 flex items-center justify-center mb-3 overflow-hidden">
                      <div className="absolute inset-0 bg-linear-to-br from-blue-900/20 to-[#0d1117]/50" />
                      {ad.snapshotUrl ? (
                        <a href={ad.snapshotUrl} target="_blank" rel="noopener noreferrer"
                          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors cursor-pointer">
                          <ExternalLink className="w-4 h-4 text-white" />
                        </a>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Play className="w-4 h-4 text-white ml-0.5" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge variant={ad.platform === "TikTok" ? "purple" : ad.platform === "Facebook" ? "blue" : "warning"}>{ad.platform}</Badge>
                      </div>
                      <div className="absolute bottom-2 left-2 text-xs text-white/70">{ad.days}d running</div>
                      <div className="absolute bottom-2 right-2">
                        <Badge variant={ad.score >= 90 ? "success" : ad.score >= 75 ? "blue" : "warning"}>Score {ad.score}</Badge>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-gray-900 truncate">{ad.product || ad.brand}</p>
                    <p className="text-xs text-gray-500 mb-1">{ad.brand} · Angle: <span className="text-blue-600">{ad.angle}</span></p>
                    {ad.body && <p className="text-xs text-gray-400 mb-2 line-clamp-2 italic">&ldquo;{ad.body}&rdquo;</p>}

                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                      <div className="text-center bg-gray-50 rounded-lg p-1.5">
                        <Eye className="w-3 h-3 text-blue-600 mx-auto mb-0.5" />
                        <p className="text-xs font-bold text-gray-900">{ad.views}</p>
                        <p className="text-xs text-gray-400">Impressions</p>
                      </div>
                      <div className="text-center bg-gray-50 rounded-lg p-1.5">
                        <Heart className="w-3 h-3 text-red-600 mx-auto mb-0.5" />
                        <p className="text-xs font-bold text-gray-900">{ad.likes.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">Est. Likes</p>
                      </div>
                      <div className="text-center bg-gray-50 rounded-lg p-1.5">
                        <TrendingUp className="w-3 h-3 text-green-600 mx-auto mb-0.5" />
                        <p className="text-xs font-bold text-gray-900">{ad.spend}</p>
                        <p className="text-xs text-gray-400">Est. Spend</p>
                      </div>
                    </div>

                    <Button size="sm" variant="secondary" className="w-full" onClick={() => copy(ad.body || ad.product)}>
                      <Megaphone className="w-3.5 h-3.5" />
                      {copied === (ad.body || ad.product) ? "Copied!" : "Copy Ad Body"}
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* AI Ad Script Generator + Angle Stats */}
          <div className="space-y-4">
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" /> Script Generator
              </h3>
              <p className="text-xs text-gray-500 mb-3">Auto-generate TikTok &amp; Facebook scripts via AI</p>
              <input
                ref={productRef}
                defaultValue="Wireless Neck Massager"
                placeholder="Product name..."
                className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 mb-2"
              />
              <select ref={formatRef} className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-500 focus:outline-none mb-3 cursor-pointer">
                <option>TikTok Hook Script</option>
                <option>Facebook Ad Copy</option>
                <option>Instagram Caption</option>
                <option>UGC Video Script</option>
              </select>
              <Button size="sm" className="w-full" onClick={generateScripts} loading={scriptLoading}>Generate Scripts</Button>

              {scriptError && (
                <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{scriptError}
                </div>
              )}

              {scripts.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {scriptLoading ? "Generating..." : "Generated Scripts"}
                  </p>
                  {scripts.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200 group">
                      <p className="text-xs text-gray-500 flex-1 leading-relaxed">{s}</p>
                      <button onClick={() => copy(s)}
                        className="shrink-0 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                        {copied === s ? <CheckCheck className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Top Ad Angles{ads.length > 0 ? " (Live)" : ""}</h3>
              <div className="space-y-2">
                {angleStats.map(([angle, count], i) => {
                  const pct = Math.round(((count as number) / maxAngle) * 100);
                  return (
                    <div key={angle}>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{angle}</span><span>{ads.length > 0 ? `${count} ads` : `${count}%`}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className={`h-full rounded-full ${angleColors[i] ?? "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
