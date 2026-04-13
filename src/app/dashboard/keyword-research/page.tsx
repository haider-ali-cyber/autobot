"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, TrendingDown, Zap, Copy, CheckCheck } from "lucide-react";

const mockKeywords = [
  { keyword: "neck massager electric", volume: 48200, cpc: "$1.24", competition: "Low", trend: "up", difficulty: 22, platform: "Amazon" },
  { keyword: "neck massager pillow", volume: 32100, cpc: "$0.98", competition: "Low", trend: "up", difficulty: 28, platform: "Amazon" },
  { keyword: "best neck massager 2025", volume: 18700, cpc: "$1.56", competition: "Medium", trend: "up", difficulty: 45, platform: "Google" },
  { keyword: "wireless neck massager", volume: 24300, cpc: "$1.12", competition: "Low", trend: "up", difficulty: 31, platform: "Amazon" },
  { keyword: "shiatsu neck massager", volume: 61800, cpc: "$1.78", competition: "High", trend: "down", difficulty: 68, platform: "Amazon" },
  { keyword: "neck shoulder massager", volume: 39400, cpc: "$1.33", competition: "Medium", trend: "up", difficulty: 52, platform: "Amazon" },
  { keyword: "neck massager tiktok", volume: 15200, cpc: "$0.44", competition: "Low", trend: "up", difficulty: 14, platform: "TikTok" },
  { keyword: "portable neck massager", volume: 27600, cpc: "$1.05", competition: "Low", trend: "up", difficulty: 35, platform: "Shopify" },
];

const competitorASINs = [
  { asin: "B09XLMQQ7W", title: "Comfier Neck Massager", keywords: 342, topKeyword: "neck massager electric", rank: 1 },
  { asin: "B08NWGQ5TF", title: "RENPHO Neck Massager", keywords: 287, topKeyword: "shiatsu neck massager", rank: 2 },
  { asin: "B07ZJKWW8N", title: "InvoSpa Neck Massager", keywords: 219, topKeyword: "neck massager pillow", rank: 3 },
];

export default function KeywordResearchPage() {
  const [query, setQuery] = useState("neck massager");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [platform, setPlatform] = useState("Amazon");

  function handleSearch() {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  }

  function handleCopy(kw: string) {
    navigator.clipboard.writeText(kw);
    setCopied(kw);
    setTimeout(() => setCopied(null), 1500);
  }

  const diffColor = (d: number) =>
    d < 30 ? "text-green-600" : d < 55 ? "text-amber-600" : "text-red-600";

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
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder='Enter seed keyword e.g. "yoga mat", "phone case"'
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
                <Zap className="w-3.5 h-3.5" /> Research
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              { label: "Keywords Found", value: "127", color: "text-blue-600" },
              { label: "Total Search Vol.", value: "267K", color: "text-blue-600" },
              { label: "Low Competition", value: "43", color: "text-green-600" },
              { label: "Avg. CPC", value: "$1.18", color: "text-amber-600" },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Keyword Table */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Keyword Results</h3>
              <Badge variant="success">{mockKeywords.length} keywords</Badge>
            </div>
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
                  {mockKeywords.map(kw => (
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
          </Card>

          {/* Reverse ASIN */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Reverse ASIN Lookup</h3>
            <p className="text-xs text-gray-500 mb-3">Steal competitor keywords</p>
            <Input placeholder="Enter ASIN e.g. B09XLMQQ7W" className="mb-3" />
            <Button size="sm" className="w-full mb-4" variant="secondary">
              <Search className="w-3.5 h-3.5" /> Find Keywords
            </Button>
            <div className="space-y-2">
              {competitorASINs.map(c => (
                <div key={c.asin} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-900 truncate">{c.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.asin}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-blue-600">{c.keywords} keywords</span>
                    <Badge variant="success">Rank #{c.rank}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Top: <span className="text-gray-500">{c.topKeyword}</span></p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
