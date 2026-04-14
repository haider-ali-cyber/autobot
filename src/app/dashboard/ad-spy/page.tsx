"use client";
import { useState, useRef } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, Search, Play, Heart, Eye, TrendingUp, Zap, Copy, CheckCheck, AlertCircle } from "lucide-react";

const tiktokAds = [
  { brand: "NeckEase Pro", product: "Wireless Neck Massager", views: "2.4M", likes: "89K", shares: "12K", spend: "$8,400", days: 18, platform: "TikTok", angle: "Pain Relief Story", score: 94 },
  { brand: "ComfortZone", product: "Posture Corrector Belt", views: "1.8M", likes: "64K", shares: "8.2K", spend: "$6,100", days: 24, platform: "TikTok", angle: "Before/After Demo", score: 88 },
  { brand: "GadgetPros", product: "Magnetic Phone Stand", views: "3.1M", likes: "112K", shares: "19K", spend: "$11,200", days: 31, platform: "Facebook", angle: "Problem/Solution", score: 96 },
  { brand: "HomeGlow", product: "LED Ring Light", views: "920K", likes: "41K", shares: "5.4K", spend: "$3,800", days: 12, platform: "Instagram", angle: "Influencer UGC", score: 79 },
  { brand: "FitLife Store", product: "Resistance Band Set", views: "1.4M", likes: "53K", shares: "7.1K", spend: "$5,200", days: 20, platform: "Facebook", angle: "Testimonial", score: 82 },
  { brand: "ZenRelax", product: "Eye Massager", views: "4.2M", likes: "187K", shares: "31K", spend: "$14,600", days: 42, platform: "TikTok", angle: "ASMR + Demo", score: 98 },
];

export default function AdSpyPage() {
  const [platform, setPlatform] = useState("All");
  const [query, setQuery] = useState("neck massager");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const productRef = useRef<HTMLInputElement>(null);
  const formatRef = useRef<HTMLSelectElement>(null);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [scripts, setScripts] = useState<string[]>([
    "POV: You've had neck pain for 3 years. Then you tried this... 🤯",
    "Stop scrolling if you work from home and your neck always hurts →",
    "My chiropractor told me to stop coming. Here's why 👇",
    "I bought this as a joke. Now I use it every single day.",
  ]);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  }

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

  const filtered = tiktokAds.filter(a =>
    (platform === "All" || a.platform === platform) &&
    (query === "" || a.product.toLowerCase().includes(query.toLowerCase()) || a.brand.toLowerCase().includes(query.toLowerCase()))
  );

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
                placeholder="Search by product, brand, or keyword..."
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {["All", "TikTok", "Facebook", "Instagram"].map(p => (
                <button key={p} onClick={() => setPlatform(p)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${platform === p ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                >{p}</button>
              ))}
              <Button onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 900); }} loading={loading} size="sm">
                <Zap className="w-3.5 h-3.5" /> Spy
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Ad Cards */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500"><span className="text-gray-900 font-semibold">{filtered.length}</span> winning ads found</p>
              <Badge variant="success">Sorted by Performance</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((ad, i) => (
                <Card key={i} className="hover:border-blue-200 transition-colors">
                  {/* Fake video thumbnail */}
                  <div className="relative bg-linear-to-br from-[#21262d] to-[#0d1117] rounded-md h-32 flex items-center justify-center mb-3 overflow-hidden">
                    <div className="absolute inset-0 bg-linear-to-br from-blue-900/20 to-[#0d1117]/50" />
                    <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors cursor-pointer">
                      <Play className="w-4 h-4 text-white ml-0.5" />
                    </button>
                    <div className="absolute top-2 right-2">
                      <Badge variant={ad.platform === "TikTok" ? "purple" : ad.platform === "Facebook" ? "blue" : "warning"}>{ad.platform}</Badge>
                    </div>
                    <div className="absolute bottom-2 left-2 text-xs text-white/70">{ad.days} days running</div>
                    <div className="absolute bottom-2 right-2">
                      <Badge variant={ad.score >= 95 ? "success" : ad.score >= 85 ? "blue" : "warning"}>Score {ad.score}</Badge>
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-gray-900">{ad.product}</p>
                  <p className="text-xs text-gray-500 mb-2">{ad.brand} · Angle: <span className="text-blue-600">{ad.angle}</span></p>

                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    <div className="text-center bg-gray-50 rounded-lg p-1.5">
                      <Eye className="w-3 h-3 text-blue-600 mx-auto mb-0.5" />
                      <p className="text-xs font-bold text-gray-900">{ad.views}</p>
                      <p className="text-xs text-gray-400">Views</p>
                    </div>
                    <div className="text-center bg-gray-50 rounded-lg p-1.5">
                      <Heart className="w-3 h-3 text-red-600 mx-auto mb-0.5" />
                      <p className="text-xs font-bold text-gray-900">{ad.likes}</p>
                      <p className="text-xs text-gray-400">Likes</p>
                    </div>
                    <div className="text-center bg-gray-50 rounded-lg p-1.5">
                      <TrendingUp className="w-3 h-3 text-green-600 mx-auto mb-0.5" />
                      <p className="text-xs font-bold text-gray-900">{ad.spend}</p>
                      <p className="text-xs text-gray-400">Est. Spend</p>
                    </div>
                  </div>

                  <Button size="sm" variant="secondary" className="w-full">
                    <Megaphone className="w-3.5 h-3.5" /> Copy This Ad Strategy
                  </Button>
                </Card>
              ))}
            </div>
          </div>

          {/* AI Ad Script Generator */}
          <div className="space-y-4">
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" /> Script Generator
              </h3>
              <p className="text-xs text-gray-500 mb-3">Auto-generate TikTok & Facebook scripts via AI</p>
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
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Top Ad Angles in Niche</h3>
              <div className="space-y-2">
                {[
                  { angle: "Pain Story / Relatable", usage: 78, color: "bg-blue-500" },
                  { angle: "Before/After Demo", usage: 65, color: "bg-purple-500" },
                  { angle: "ASMR / Satisfying", usage: 54, color: "bg-green-500" },
                  { angle: "Influencer UGC", usage: 48, color: "bg-amber-500" },
                  { angle: "Problem/Solution", usage: 42, color: "bg-pink-500" },
                ].map(a => (
                  <div key={a.angle}>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{a.angle}</span><span>{a.usage}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className={`h-full rounded-full ${a.color}`} style={{ width: `${a.usage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
