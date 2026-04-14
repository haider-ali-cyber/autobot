"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Plus, X, Zap, AlertCircle, AlertTriangle, CheckCircle, TrendingDown } from "lucide-react";

interface ProductInput { name: string; stock: number; dailySales: number; costPerUnit: number; leadTimeDays: number; }
interface InventoryAlert { product: string; currentStock: number; dailySales: number; daysLeft: number; reorderPoint: number; reorderQty: number; riskLevel: "Critical" | "Warning" | "Healthy"; action: string; leadTimeDays: number; }
interface InventoryData { alerts: InventoryAlert[]; summary: { critical: number; warning: number; healthy: number; totalValue: string }; recommendations: string[]; }

const RISK_CONFIG = {
  Critical: { color: "text-red-600", bg: "bg-red-50", border: "border-red-200", icon: AlertTriangle, badge: "danger" as const },
  Warning: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", icon: AlertCircle, badge: "warning" as const },
  Healthy: { color: "text-green-600", bg: "bg-green-50", border: "border-green-200", icon: CheckCircle, badge: "success" as const },
};

const EMPTY: ProductInput = { name: "", stock: 100, dailySales: 5, costPerUnit: 10, leadTimeDays: 30 };

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductInput[]>([
    { name: "Neck Massager", stock: 45, dailySales: 8, costPerUnit: 12, leadTimeDays: 30 },
    { name: "LED Desk Lamp", stock: 210, dailySales: 4, costPerUnit: 8, leadTimeDays: 25 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InventoryData | null>(null);

  function updateProduct(i: number, field: keyof ProductInput, value: string) {
    setProducts(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: field === "name" ? value : parseFloat(value) || 0 } : p));
  }
  function addRow() { setProducts(p => [...p, { ...EMPTY }]); }
  function removeRow(i: number) { setProducts(p => p.filter((_, idx) => idx !== i)); }

  async function analyze() {
    const valid = products.filter(p => p.name.trim());
    if (valid.length === 0) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/ai/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: valid }),
      });
      const json = await res.json() as InventoryData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Inventory Planner" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Input Table */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Your Products</h3>
            <Button size="sm" variant="secondary" onClick={addRow}><Plus className="w-3.5 h-3.5" /> Add Product</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  {["Product Name", "Current Stock", "Daily Sales", "Cost/Unit ($)", "Lead Time (days)", ""].map(h => (
                    <th key={h} className="text-left text-gray-500 font-medium pb-2 pr-3 last:pr-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3">
                      <input value={p.name} onChange={e => updateProduct(i, "name", e.target.value)}
                        placeholder="Product name" className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm text-gray-900 w-36 focus:outline-none focus:border-blue-500" />
                    </td>
                    {(["stock", "dailySales", "costPerUnit", "leadTimeDays"] as const).map(field => (
                      <td key={field} className="py-2 pr-3">
                        <input type="number" value={p[field]} onChange={e => updateProduct(i, field, e.target.value)}
                          className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm text-gray-900 w-20 focus:outline-none focus:border-blue-500 text-right" />
                      </td>
                    ))}
                    <td className="py-2">
                      <button onClick={() => removeRow(i)} className="p-1 hover:text-red-500 text-gray-400 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">{products.filter(p => p.name.trim()).length} products ready to analyze</p>
            <div className="flex items-center gap-3">
              {error && <div className="flex items-center gap-1.5 text-xs text-red-700"><AlertCircle className="w-3.5 h-3.5" />{error}</div>}
              <Button onClick={analyze} loading={loading} size="sm" disabled={products.filter(p => p.name).length === 0}>
                <Zap className="w-3.5 h-3.5" /> Analyze Inventory
              </Button>
            </div>
          </div>
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-gray-500">Calculating reorder points & alerts...</span>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Critical", value: String(data.summary.critical), color: "text-red-600", bg: "bg-red-50" },
                { label: "Warning", value: String(data.summary.warning), color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Healthy", value: String(data.summary.healthy), color: "text-green-600", bg: "bg-green-50" },
                { label: "Total Inventory Value", value: data.summary.totalValue, color: "text-blue-600", bg: "bg-blue-50" },
              ].map(s => (
                <Card key={s.label} className={`border-0 ${s.bg}`}>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Alerts */}
              <div className="lg:col-span-2 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Inventory Alerts</h3>
                {data.alerts.map((a, i) => {
                  const cfg = RISK_CONFIG[a.riskLevel];
                  return (
                    <Card key={i} className={`border ${cfg.border}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                          <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-sm font-semibold text-gray-900">{a.product}</p>
                            <Badge variant={cfg.badge}>{a.riskLevel}</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mb-2 text-xs text-gray-500">
                            <span>Stock: <span className="font-semibold text-gray-700">{a.currentStock}</span></span>
                            <span>Sales/day: <span className="font-semibold text-gray-700">{a.dailySales.toFixed(1)}</span></span>
                            <span className={a.daysLeft <= 14 ? "text-red-600 font-semibold" : ""}>Days left: <span className="font-semibold">{a.daysLeft}</span></span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full mb-2">
                            <div className={`h-full rounded-full ${a.riskLevel === "Critical" ? "bg-red-500" : a.riskLevel === "Warning" ? "bg-amber-500" : "bg-green-500"}`}
                              style={{ width: `${Math.min(100, (a.daysLeft / 60) * 100)}%` }} />
                          </div>
                          <p className="text-xs text-gray-500">{a.action}</p>
                          <div className="flex gap-4 text-xs text-gray-400 mt-1">
                            <span>Reorder point: <span className="text-gray-600 font-medium">{a.reorderPoint} units</span></span>
                            <span>Order qty: <span className="text-gray-600 font-medium">{a.reorderQty} units</span></span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Recommendations */}
              <div>
                <Card>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-blue-600" /> AI Recommendations
                  </h3>
                  <ul className="space-y-2.5">
                    {data.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">{i + 1}</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
