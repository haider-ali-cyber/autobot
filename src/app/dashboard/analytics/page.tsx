"use client";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, RotateCcw } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const revenueData = [
  { month: "Oct", amazon: 3200, shopify: 800, tiktok: 200 },
  { month: "Nov", amazon: 4100, shopify: 1200, tiktok: 500 },
  { month: "Dec", amazon: 6800, shopify: 1600, tiktok: 800 },
  { month: "Jan", amazon: 4900, shopify: 1400, tiktok: 800 },
  { month: "Feb", amazon: 5700, shopify: 1800, tiktok: 900 },
  { month: "Mar", amazon: 7400, shopify: 2200, tiktok: 1600 },
];

const topProducts = [
  { name: "Magnetic Wireless Charger", revenue: 3240, units: 162, returns: 4, platform: "Amazon" },
  { name: "LED Desk Lamp Pro", revenue: 2180, units: 109, returns: 2, platform: "Shopify" },
  { name: "Posture Corrector Belt", revenue: 1960, units: 245, returns: 8, platform: "TikTok" },
  { name: "Wireless Earbuds X3", revenue: 1540, units: 77, returns: 3, platform: "Amazon" },
  { name: "Bamboo Cutting Board Set", revenue: 1120, units: 64, returns: 1, platform: "Shopify" },
];

const platformShare = [
  { name: "Amazon", value: 66, color: "#f59e0b" },
  { name: "Shopify", value: 20, color: "#22c55e" },
  { name: "TikTok Shop", value: 14, color: "#3b82f6" },
];

const ordersData = [
  { day: "Mon", orders: 48 }, { day: "Tue", orders: 62 }, { day: "Wed", orders: 55 },
  { day: "Thu", orders: 71 }, { day: "Fri", orders: 89 }, { day: "Sat", orders: 103 }, { day: "Sun", orders: 76 },
];

export default function AnalyticsPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Sales Analytics" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Revenue (Mar)", value: "$11,200", change: "+18.4%", up: true, icon: DollarSign },
            { label: "Total Orders", value: "623", change: "+12.1%", up: true, icon: ShoppingCart },
            { label: "Units Sold", value: "847", change: "+8.3%", up: true, icon: Package },
            { label: "Return Rate", value: "2.1%", change: "-0.4%", up: true, icon: RotateCcw },
          ].map(s => (
            <Card key={s.label} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <s.icon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <div className="flex items-center gap-1">
                  {s.up ? <TrendingUp className="w-3 h-3 text-green-600" /> : <TrendingDown className="w-3 h-3 text-red-600" />}
                  <span className="text-xs text-green-600">{s.change}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Revenue Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Revenue by Platform</h3>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Amazon</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Shopify</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />TikTok</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData}>
                <defs>
                  {[["amz", "#f59e0b"], ["shop", "#22c55e"], ["tt", "#3b82f6"]].map(([id, color]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis dataKey="month" stroke="#e5e7eb" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#e5e7eb" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}k`} />
                <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", color: "#111827" }} formatter={(v: unknown) => [`$${(v as number).toLocaleString()}`]} />
                <Area type="monotone" dataKey="amazon" stroke="#f59e0b" strokeWidth={2} fill="url(#amz)" />
                <Area type="monotone" dataKey="shopify" stroke="#22c55e" strokeWidth={2} fill="url(#shop)" />
                <Area type="monotone" dataKey="tiktok" stroke="#3b82f6" strokeWidth={2} fill="url(#tt)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Platform Share */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Platform Share</h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={platformShare} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                  {platformShare.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px" }} formatter={(v: unknown) => [`${v}%`]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {platformShare.map(p => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
                    <span className="text-gray-500">{p.name}</span>
                  </span>
                  <span className="font-semibold text-gray-900">{p.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Weekly Orders */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Orders This Week</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={ordersData}>
                <XAxis dataKey="day" stroke="#e5e7eb" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#e5e7eb" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", color: "#111827" }} formatter={(v: unknown) => [v as number, "Orders"]} />
                <Bar dataKey="orders" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Top Products */}
          <Card className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Products by Revenue</h3>
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-gray-900 truncate">{p.name}</p>
                      <span className="text-xs font-semibold text-green-600 ml-2">${p.revenue.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(p.revenue / 3240) * 100}%` }} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{p.units} units</span>
                      <span>{p.returns} returns</span>
                      <Badge variant={p.platform === "Amazon" ? "warning" : p.platform === "Shopify" ? "success" : "blue"}>{p.platform}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
