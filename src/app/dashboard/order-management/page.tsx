"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Search, Filter, Package, Truck, CheckCircle, XCircle, RefreshCw, MessageSquare } from "lucide-react";

const orders = [
  { id: "#US-10492", product: "Magnetic Wireless Charger", customer: "James Wilson", date: "Mar 31", platform: "Amazon", status: "Shipped", amount: "$24.99", tracking: "1Z9999W99999999999", country: "USA" },
  { id: "#US-10491", product: "Posture Corrector Belt", customer: "Sarah Johnson", date: "Mar 31", platform: "Shopify", status: "Processing", amount: "$19.99", tracking: "—", country: "USA" },
  { id: "#UK-10490", product: "LED Desk Lamp Pro", customer: "Oliver Smith", date: "Mar 30", platform: "Amazon", status: "Delivered", amount: "$34.99", tracking: "JD014600004GB", country: "UK" },
  { id: "#US-10489", product: "Neck Massager Pillow", customer: "Emily Davis", date: "Mar 30", platform: "TikTok Shop", status: "Shipped", amount: "$39.99", tracking: "9400111899227624846", country: "USA" },
  { id: "#US-10488", product: "Bamboo Cutting Board", customer: "Michael Brown", date: "Mar 29", platform: "Shopify", status: "Return Requested", amount: "$29.99", tracking: "—", country: "USA" },
  { id: "#US-10487", product: "Wireless Earbuds X3", customer: "Jessica Lee", date: "Mar 29", platform: "Amazon", status: "Delivered", amount: "$49.99", tracking: "1Z9999W12345678901", country: "USA" },
  { id: "#CA-10486", product: "Resistance Band Set", customer: "Liam Anderson", date: "Mar 28", platform: "Shopify", status: "Processing", amount: "$17.99", tracking: "—", country: "Canada" },
  { id: "#US-10485", product: "Portable Blender USB", customer: "Ava Martinez", date: "Mar 28", platform: "TikTok Shop", status: "Cancelled", amount: "$29.99", tracking: "—", country: "USA" },
];

const statusConfig: Record<string, { variant: "success" | "warning" | "blue" | "danger" | "outline"; icon: typeof CheckCircle }> = {
  "Shipped": { variant: "blue", icon: Truck },
  "Processing": { variant: "warning", icon: RefreshCw },
  "Delivered": { variant: "success", icon: CheckCircle },
  "Return Requested": { variant: "danger", icon: RefreshCw },
  "Cancelled": { variant: "danger", icon: XCircle },
};

export default function OrderManagementPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [platformFilter, setPlatformFilter] = useState("All");

  const filtered = orders.filter(o =>
    (statusFilter === "All" || o.status === statusFilter) &&
    (platformFilter === "All" || o.platform === platformFilter) &&
    (search === "" || o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.product.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    total: orders.length,
    shipped: orders.filter(o => o.status === "Shipped").length,
    delivered: orders.filter(o => o.status === "Delivered").length,
    returns: orders.filter(o => o.status === "Return Requested").length,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Order Management" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Orders",    value: stats.total,     valueColor: "text-gray-900", icon: ShoppingCart, iconBg: "bg-blue-50",   iconColor: "text-blue-600" },
            { label: "In Transit",      value: stats.shipped,   valueColor: "text-blue-600",  icon: Truck,        iconBg: "bg-blue-50",   iconColor: "text-blue-600" },
            { label: "Delivered",       value: stats.delivered, valueColor: "text-green-600", icon: CheckCircle,  iconBg: "bg-green-50",  iconColor: "text-green-600" },
            { label: "Return Requests", value: stats.returns,   valueColor: "text-red-600",   icon: RefreshCw,    iconBg: "bg-red-50",    iconColor: "text-red-600" },
          ].map(s => (
            <Card key={s.label} className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${s.iconBg} flex items-center justify-center shrink-0`}>
                <s.icon className={`w-4 h-4 ${s.iconColor}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${s.valueColor}`}>{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search order ID, product, or customer..."
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-gray-500" />
                {["All", "Processing", "Shipped", "Delivered", "Return Requested"].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${statusFilter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                  >{s}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            {["All", "Amazon", "Shopify", "TikTok Shop"].map(p => (
              <button key={p} onClick={() => setPlatformFilter(p)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${platformFilter === p ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-gray-100 text-gray-500 hover:text-gray-900"}`}
              >{p}</button>
            ))}
          </div>
        </Card>

        {/* Orders Table */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500"><span className="text-gray-900 font-semibold">{filtered.length}</span> orders</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary">Export CSV</Button>
              <Button size="sm">Bulk Fulfill</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  {["Order ID", "Product", "Customer", "Platform", "Date", "Amount", "Status", "Tracking", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs text-gray-500 pb-2 font-medium pr-4 last:pr-0 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/50">
                {filtered.map((o) => {
                  const cfg = statusConfig[o.status] || { variant: "outline", icon: Package };
                  const Icon = cfg.icon;
                  return (
                    <tr key={o.id} className="hover:bg-gray-100/20 transition-colors">
                      <td className="py-3 pr-4">
                        <p className="text-xs font-mono text-blue-600">{o.id}</p>
                        <p className="text-xs text-gray-400">{o.country}</p>
                      </td>
                      <td className="py-3 pr-4 max-w-[160px]">
                        <p className="text-xs text-gray-900 truncate">{o.product}</p>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-500 whitespace-nowrap">{o.customer}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={o.platform === "Amazon" ? "warning" : o.platform === "Shopify" ? "success" : "blue"}>
                          {o.platform}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-500 whitespace-nowrap">{o.date}</td>
                      <td className="py-3 pr-4 text-xs font-semibold text-green-600">{o.amount}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5" />
                          <Badge variant={cfg.variant}>{o.status}</Badge>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-xs font-mono text-gray-500 max-w-[120px] truncate">{o.tracking}</td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer" title="Message customer">
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer" title="View order">
                            <Package className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
