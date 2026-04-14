"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, CheckCircle, Bell, Search, ExternalLink, Zap, AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Threat {
  type: string;
  product: string;
  seller: string;
  severity: string;
  status: string;
  platform: string;
  description: string;
  action: string;
}

interface MonitorKeyword {
  keyword: string;
  mentions: number;
  risk: string;
  platforms: string[];
  trend: string;
}

interface BrandData {
  brandName: string;
  threats: Threat[];
  monitorKeywords: MonitorKeyword[];
  protectionTips: string[];
  threatSummary: { active: number; reported: number; monitoring: number; resolved: number };
}

const brandAssets = [
  { name: "Brand™", type: "Trademark", country: "USA", status: "Registered", expiry: "Dec 2034" },
  { name: "Brand™", type: "Trademark", country: "UK", status: "Pending", expiry: "—" },
  { name: "brand.com", type: "Domain", country: "Global", status: "Active", expiry: "Nov 2026" },
  { name: "Logo Design", type: "Copyright", country: "USA", status: "Registered", expiry: "2074" },
];

export default function BrandProtectionPage() {
  const [brand, setBrand] = useState("");
  const [niche, setNiche] = useState("ecommerce");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BrandData | null>(null);

  async function handleScan() {
    const b = brand.trim();
    if (!b) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/brand-protection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: b, niche }),
      });
      const json = await res.json() as BrandData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  const summary = data?.threatSummary;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Brand Protection" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Search */}
        <Card>
          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input value={brand} onChange={e => setBrand(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleScan()}
                placeholder='Enter your brand name e.g. "TechNova", "PureGlow"'
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <select value={niche} onChange={e => setNiche(e.target.value)}
              className="bg-gray-100 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-600 focus:outline-none cursor-pointer">
              <option value="ecommerce">General E-commerce</option>
              <option value="health & beauty">Health & Beauty</option>
              <option value="electronics">Electronics</option>
              <option value="home & kitchen">Home & Kitchen</option>
              <option value="fashion">Fashion & Apparel</option>
            </select>
            <Button onClick={handleScan} loading={loading} size="sm">
              <Zap className="w-3.5 h-3.5" /> Scan Brand
            </Button>
          </div>
          {error && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </div>
          )}
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-gray-500">Scanning brand threats with AI...</span>
          </div>
        )}

        {!loading && !data && !error && (
          <div className="text-center py-16 text-sm text-gray-400">
            Enter your brand name and click Scan Brand to detect threats and monitor mentions.
          </div>
        )}

        {!loading && data && (
          <>
            {/* Alert Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Active Threats", value: String(summary?.active ?? 0), color: "text-red-600", bg: "bg-red-50", icon: AlertTriangle },
                { label: "Reported", value: String(summary?.reported ?? 0), color: "text-amber-600", bg: "bg-amber-50", icon: Bell },
                { label: "Monitoring", value: String(summary?.monitoring ?? 0), color: "text-blue-600", bg: "bg-blue-50", icon: Search },
                { label: "Resolved (30d)", value: String(summary?.resolved ?? 0), color: "text-green-600", bg: "bg-green-50", icon: CheckCircle },
              ].map(s => (
                <Card key={s.label} className={`flex items-center gap-3 border-0 ${s.bg}`}>
                  <s.icon className={`w-8 h-8 ${s.color} shrink-0`} />
                  <div>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Threat Feed */}
              <Card className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-red-600" /> Detected Threats · AI Scan
                  </h3>
                  <Badge variant="blue">{data.brandName}</Badge>
                </div>
                <div className="space-y-3">
                  {data.threats.map((t, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.severity === "High" ? "bg-red-100" : t.severity === "Medium" ? "bg-amber-100" : "bg-blue-50"}`}>
                        <AlertTriangle className={`w-4 h-4 ${t.severity === "High" ? "text-red-600" : t.severity === "Medium" ? "text-amber-600" : "text-blue-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <Badge variant={t.severity === "High" ? "danger" : t.severity === "Medium" ? "warning" : "outline"}>{t.type}</Badge>
                          <Badge variant={t.status === "Active" ? "danger" : t.status === "Reported" ? "warning" : t.status === "Monitoring" ? "blue" : "outline"}>{t.status}</Badge>
                          <Badge variant="outline">{t.platform}</Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate">{t.product}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                        <p className="text-xs text-blue-600 mt-1">→ {t.action}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button size="sm" variant="danger">Report</Button>
                        <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500 cursor-pointer">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Protection Tips */}
                {data.protectionTips.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" /> AI Protection Recommendations
                    </p>
                    <ul className="space-y-1">
                      {data.protectionTips.map((tip, i) => (
                        <li key={i} className="text-xs text-blue-600 flex items-start gap-1.5">
                          <span className="shrink-0 mt-0.5">•</span>{tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>

              {/* Right Panel */}
              <div className="space-y-4">
                {/* Brand Assets */}
                <Card>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Brand Assets</h3>
                  <div className="space-y-2">
                    {brandAssets.map((a, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs font-medium text-gray-900">{a.name.replace("Brand", data.brandName)}</p>
                          <p className="text-xs text-gray-400">{a.type} · {a.country}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={a.status === "Registered" || a.status === "Active" ? "success" : "warning"}>{a.status}</Badge>
                          <p className="text-xs text-gray-400 mt-0.5">{a.expiry}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" variant="secondary" className="w-full mt-3">+ Register New Trademark</Button>
                </Card>

                {/* Keyword Monitor */}
                <Card>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Brand Mentions Monitor</h3>
                  <div className="space-y-3">
                    {data.monitorKeywords.map((k, i) => (
                      <div key={i} className="p-2.5 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900">&quot;{k.keyword}&quot;</p>
                          <div className="flex items-center gap-1">
                            {k.trend === "up" ? <TrendingUp className="w-3 h-3 text-red-500" /> : k.trend === "down" ? <TrendingDown className="w-3 h-3 text-green-500" /> : <Minus className="w-3 h-3 text-gray-400" />}
                            <span className="text-xs text-gray-500">{k.mentions}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {k.platforms.length > 0
                            ? k.platforms.map(p => <Badge key={p} variant="outline">{p}</Badge>)
                            : <span className="text-xs text-gray-400">No mentions found ✓</span>
                          }
                        </div>
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
