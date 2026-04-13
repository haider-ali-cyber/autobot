"use client";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, ArrowRight, AlertCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";

const revenueData = [
  { month: "Oct", revenue: 4200 }, { month: "Nov", revenue: 5800 }, { month: "Dec", revenue: 9200 },
  { month: "Jan", revenue: 7100 }, { month: "Feb", revenue: 8400 }, { month: "Mar", revenue: 11200 },
];

const topProducts = [
  { name: "Magnetic Phone Stand",  platform: "Amazon",  revenue: "$3,240", units: 162, margin: "44%", trend: "up" },
  { name: "LED Desk Lamp Pro",     platform: "Shopify",  revenue: "$2,180", units: 109, margin: "38%", trend: "up" },
  { name: "Posture Corrector Belt",platform: "TikTok",   revenue: "$1,960", units: 245, margin: "51%", trend: "up" },
  { name: "Wireless Earbuds X3",   platform: "Amazon",  revenue: "$1,540", units: 77,  margin: "29%", trend: "down" },
];

const notices = [
  { level: "warn",  text: "Magnetic Phone Stand — stock low (23 units remaining)" },
  { level: "info",  text: "2 new orders awaiting fulfillment on Shopify" },
  { level: "warn",  text: "Competitor dropped price by 12% on ASIN B09XLMQQ7W" },
  { level: "info",  text: "Neck Massager keyword volume up 34% this week" },
];

const shortcuts = [
  { label: "Product Research",  href: "/dashboard/product-hunter" },
  { label: "Build a Listing",   href: "/dashboard/listing-generator" },
  { label: "Calculate Profit",  href: "/dashboard/profit-calculator" },
  { label: "Find Suppliers",    href: "/dashboard/supplier-finder" },
];

export default function DashboardPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Overview" />
      <main className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Revenue (Mar)",   value: "$11,240", change: "+18.4%", up: true,  icon: DollarSign,  iconBg: "bg-blue-50",   iconColor: "text-blue-600" },
            { label: "Active Products", value: "47",      change: "+5 this month", up: true,  icon: Package,     iconBg: "bg-purple-50", iconColor: "text-purple-600" },
            { label: "Orders (Mar)",    value: "623",     change: "+12.1%", up: true,  icon: ShoppingCart, iconBg: "bg-green-50",  iconColor: "text-green-600" },
            { label: "Avg. Margin",     value: "41.2%",   change: "+2.1 pts", up: true, icon: TrendingUp,  iconBg: "bg-amber-50",  iconColor: "text-amber-600" },
          ].map((s) => (
            <Card key={s.label} className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg ${s.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                <s.icon className={`w-4 h-4 ${s.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{s.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  {s.up
                    ? <TrendingUp className="w-3 h-3 text-green-600" />
                    : <TrendingDown className="w-3 h-3 text-red-600" />}
                  <span className={`text-xs font-medium ${s.up ? "text-green-600" : "text-red-600"}`}>{s.change}</span>
                  <span className="text-xs text-gray-400">vs last mo</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Revenue Chart */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Revenue</p>
                <p className="text-xs text-gray-500">Oct 2024 – Mar 2025</p>
              </div>
              <span className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">+18.4% MoM</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#e5e7eb" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#e5e7eb" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "6px", color: "#111827", fontSize: 12 }} formatter={(v: unknown) => [`$${(v as number).toLocaleString()}`, "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={1.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Notices */}
          <Card>
            <p className="text-sm font-medium text-gray-900 mb-3">Notifications</p>
            <div className="space-y-2">
              {notices.map((n, i) => (
                <div key={i} className="flex gap-2.5 items-start p-2.5 rounded bg-gray-50 border border-gray-100">
                  <AlertCircle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${n.level === "warn" ? "text-amber-600" : "text-blue-600"}`} />
                  <p className="text-xs text-gray-500 leading-relaxed">{n.text}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Top Products Table */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-900">Top Products — March</p>
              <Link href="/dashboard/analytics" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                All products <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Product", "Platform", "Revenue", "Units", "Margin"].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-medium pb-2 pr-3 last:pr-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topProducts.map(p => (
                  <tr key={p.name} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        {p.trend === "up"
                          ? <TrendingUp className="w-3 h-3 text-green-600 shrink-0" />
                          : <TrendingDown className="w-3 h-3 text-red-600 shrink-0" />}
                        <span className="text-xs text-gray-900 truncate max-w-[140px]">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge variant={p.platform === "Amazon" ? "warning" : p.platform === "Shopify" ? "success" : "blue"}>
                        {p.platform}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-xs font-medium text-gray-900">{p.revenue}</td>
                    <td className="py-2.5 pr-3 text-xs text-gray-500">{p.units}</td>
                    <td className="py-2.5 text-xs text-green-600">{p.margin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Shortcuts */}
          <Card>
            <p className="text-sm font-medium text-gray-900 mb-3">Quick Access</p>
            <div className="space-y-1">
              {shortcuts.map(s => (
                <Link key={s.label} href={s.href}
                  className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-gray-100 text-sm text-gray-500 hover:text-gray-900 transition-colors group">
                  <span>{s.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Plan usage</p>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Searches used</span>
                <span className="text-gray-500">750 / 2,000</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full">
                <div className="h-full w-[37%] bg-blue-600 rounded-full" />
              </div>
              <p className="text-xs text-gray-400 mt-1">Resets Apr 1</p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
