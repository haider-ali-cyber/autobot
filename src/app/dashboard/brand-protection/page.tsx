"use client";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, CheckCircle, Bell, Search, ExternalLink } from "lucide-react";

const threats = [
  { type: "Hijacker", product: "Magnetic Wireless Charger", asin: "B09XLMQQ7W", seller: "FastShipUSA", date: "Mar 29", severity: "High", status: "Active" },
  { type: "Counterfeit", product: "Posture Corrector Belt", asin: "B08NWGQ5TF", seller: "BestDealsCo", date: "Mar 27", severity: "High", status: "Reported" },
  { type: "Price Violation", product: "LED Desk Lamp Pro", asin: "B07ZJKWW8N", seller: "QuickSell99", date: "Mar 25", severity: "Medium", status: "Monitoring" },
  { type: "Fake Review", product: "Neck Massager Pillow", asin: "B075FMZ5ZW", seller: "Unknown", date: "Mar 24", severity: "Low", status: "Flagged" },
];

const brandAssets = [
  { name: "Sellora™", type: "Trademark", country: "USA", status: "Registered", expiry: "Dec 2034" },
  { name: "Sellora™", type: "Trademark", country: "UK", status: "Pending", expiry: "—" },
  { name: "sellora.com", type: "Domain", country: "Global", status: "Active", expiry: "Nov 2026" },
  { name: "Logo Design", type: "Copyright", country: "USA", status: "Registered", expiry: "2074" },
];

const monitorKeywords = [
  { keyword: "sellora", mentions: 42, platforms: ["Amazon", "Google"], trend: "stable" },
  { keyword: "sellora dupe", mentions: 3, platforms: ["TikTok"], trend: "up" },
  { keyword: "fake sellora", mentions: 0, platforms: [], trend: "stable" },
];

export default function BrandProtectionPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Brand Protection" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Alert Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Threats", value: "2", color: "text-red-600", bg: "bg-red-50", icon: AlertTriangle },
            { label: "Reported", value: "1", color: "text-amber-600", bg: "bg-amber-50", icon: Bell },
            { label: "Monitoring", value: "1", color: "text-blue-600", bg: "bg-blue-50", icon: Search },
            { label: "Resolved (30d)", value: "7", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle },
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
                <Shield className="w-4 h-4 text-red-600" /> Active Threats
              </h3>
              <Button size="sm" variant="secondary">
                <Bell className="w-3.5 h-3.5" /> Configure Alerts
              </Button>
            </div>
            <div className="space-y-3">
              {threats.map((t, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-200 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.severity === "High" ? "bg-red-100" : t.severity === "Medium" ? "bg-amber-100" : "bg-blue-50"}`}>
                    <AlertTriangle className={`w-4 h-4 ${t.severity === "High" ? "text-red-600" : t.severity === "Medium" ? "text-amber-600" : "text-blue-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <Badge variant={t.severity === "High" ? "danger" : t.severity === "Medium" ? "warning" : "outline"}>{t.type}</Badge>
                      <Badge variant={t.status === "Active" ? "danger" : t.status === "Reported" ? "warning" : t.status === "Monitoring" ? "blue" : "outline"}>{t.status}</Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{t.product}</p>
                    <p className="text-xs text-gray-500">Seller: <span className="text-gray-500">{t.seller}</span> · {t.date}</p>
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
                      <p className="text-xs font-medium text-gray-900">{a.name}</p>
                      <p className="text-xs text-gray-400">{a.type} · {a.country}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={a.status === "Registered" || a.status === "Active" ? "success" : "warning"}>{a.status}</Badge>
                      <p className="text-xs text-gray-400 mt-0.5">{a.expiry}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="secondary" className="w-full mt-3">
                + Register New Trademark
              </Button>
            </Card>

            {/* Keyword Monitor */}
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Brand Mentions Monitor</h3>
              <div className="space-y-3">
                {monitorKeywords.map((k, i) => (
                  <div key={i} className="p-2.5 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900">&quot;{k.keyword}&quot;</p>
                      <span className="text-xs text-gray-500">{k.mentions} mentions</span>
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
              <div className="flex gap-2 mt-3">
                <input placeholder="Add keyword to monitor..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                <Button size="sm">Add</Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
