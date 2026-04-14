"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, AlertCircle } from "lucide-react";

const platforms = [
  { id: "amazon-fba", label: "Amazon FBA", feePercent: 0.15, fbaFee: 4.50 },
  { id: "amazon-fbm", label: "Amazon FBM", feePercent: 0.15, fbaFee: 0 },
  { id: "shopify", label: "Shopify", feePercent: 0.02, fbaFee: 0 },
  { id: "tiktok", label: "TikTok Shop", feePercent: 0.06, fbaFee: 0 },
];

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  hint?: string;
};

function Field({ label, value, onChange, prefix = "$", hint }: FieldProps) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-200/50 last:border-0">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
      <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 w-28">
        <span className="text-xs text-gray-500">{prefix}</span>
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="bg-transparent text-sm text-gray-900 outline-none w-full text-right"
        />
      </div>
    </div>
  );
}

function calcProfit(sp: number, cost: number, ship: number, duty: number, s2c: number, ppc: number, feePercent: number, fbaFee: number) {
  const fee = sp * feePercent;
  const total = cost + ship + duty + s2c + fee + fbaFee + ppc;
  const profit = sp - total;
  const margin = sp > 0 ? ((profit / sp) * 100).toFixed(1) : "0";
  const roi = (cost + ship + duty) > 0 ? ((profit / (cost + ship + duty)) * 100).toFixed(1) : "0";
  return { profit, margin, roi };
}

export default function ProfitCalculatorPage() {
  const [platform, setPlatform] = useState("amazon-fba");
  const [productCost, setProductCost] = useState("6.20");
  const [shippingToFBA, setShippingToFBA] = useState("1.80");
  const [importDuty, setImportDuty] = useState("0.50");
  const [sellingPrice, setSellingPrice] = useState("34.99");
  const [shippingToCustomer, setShippingToCustomer] = useState("0");
  const [ppcCost, setPpcCost] = useState("2.00");
  const [units, setUnits] = useState("200");

  const plat = platforms.find(p => p.id === platform)!;
  const sp = parseFloat(sellingPrice) || 0;
  const cost = parseFloat(productCost) || 0;
  const ship = parseFloat(shippingToFBA) || 0;
  const duty = parseFloat(importDuty) || 0;
  const s2c = parseFloat(shippingToCustomer) || 0;
  const ppc = parseFloat(ppcCost) || 0;
  const u = parseInt(units) || 1;
  const investmentCost = cost + ship + duty;

  const platformFee = sp * plat.feePercent;
  const fbaFee = plat.fbaFee;
  const totalCost = cost + ship + duty + s2c + platformFee + fbaFee + ppc;
  const profit = sp - totalCost;
  const margin = sp > 0 ? ((profit / sp) * 100).toFixed(1) : "0";
  const roi = investmentCost > 0 ? ((profit / investmentCost) * 100).toFixed(1) : "0";
  const totalProfit = profit * u;

  const profitColor = profit > 0 ? "text-green-600" : "text-red-600";
  const marginBadge = parseFloat(margin) >= 30 ? "success" : parseFloat(margin) >= 15 ? "warning" : "danger";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Profit Calculator" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Platform Selector */}
        <div className="flex gap-2 flex-wrap">
          {platforms.map(p => (
            <button key={p.id} onClick={() => setPlatform(p.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${platform === p.id ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-100"}`}
            >{p.label}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Input */}
          <Card className="lg:col-span-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600" /> Cost Breakdown
            </h3>
            <p className="text-xs text-gray-500 mb-4">All prices in USD</p>

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Product Costs</p>
              <Field label="Product Cost (Alibaba)" value={productCost} onChange={setProductCost} hint="Unit price from supplier" />
              <Field label="Shipping to FBA/Warehouse" value={shippingToFBA} onChange={setShippingToFBA} hint="Sea/air freight per unit" />
              <Field label="Import Duty & Customs" value={importDuty} onChange={setImportDuty} hint="USA import tax per unit" />
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Platform Fees</p>
              <div className="flex items-center justify-between py-2.5 border-b border-gray-200/50">
                <p className="text-sm text-gray-500">Platform Fee ({(plat.feePercent * 100).toFixed(0)}%)</p>
                <span className="text-sm text-gray-500">${platformFee.toFixed(2)}</span>
              </div>
              {fbaFee > 0 && (
                <div className="flex items-center justify-between py-2.5 border-b border-gray-200/50">
                  <p className="text-sm text-gray-500">FBA Fulfillment Fee</p>
                  <span className="text-sm text-gray-500">${fbaFee.toFixed(2)}</span>
                </div>
              )}
              <Field label="Shipping to Customer" value={shippingToCustomer} onChange={setShippingToCustomer} hint="FBM only; 0 for FBA" />
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Marketing & Revenue</p>
              <Field label="PPC / Ads Cost per Unit" value={ppcCost} onChange={setPpcCost} hint="Estimated ad spend" />
              <Field label="Selling Price" value={sellingPrice} onChange={setSellingPrice} />
              <Field label="Units to Order" value={units} onChange={setUnits} prefix="#" />
            </div>
          </Card>

          {/* Results */}
          <div className="lg:col-span-2 space-y-4">
            {/* Profit Summary */}
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Profit Summary</h3>

              <div className="text-center py-4 bg-gray-50 rounded-md mb-4">
                <p className="text-xs text-gray-500 mb-1">Net Profit per Unit</p>
                <p className={`text-4xl font-bold ${profitColor}`}>${profit.toFixed(2)}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge variant={marginBadge as "success" | "warning" | "danger"}>{margin}% margin</Badge>
                  <Badge variant="purple">ROI {roi}%</Badge>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { label: "Total Revenue", value: `$${(sp * u).toFixed(2)}`, color: "text-gray-500" },
                  { label: "Total COGS", value: `$${(investmentCost * u).toFixed(2)}`, color: "text-red-600" },
                  { label: "Total Fees", value: `$${((platformFee + fbaFee + ppc) * u).toFixed(2)}`, color: "text-amber-600" },
                  { label: "Total Net Profit", value: `$${totalProfit.toFixed(2)}`, color: "text-green-600" },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{r.label}</span>
                    <span className={`font-semibold ${r.color}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Cost Breakdown */}
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Cost Breakdown</h3>
              <div className="space-y-2">
                {[
                  { label: "Product Cost", value: cost, total: totalCost, color: "bg-blue-500" },
                  { label: "Shipping + Duty", value: ship + duty, total: totalCost, color: "bg-amber-500" },
                  { label: "Platform Fees", value: platformFee + fbaFee, total: totalCost, color: "bg-purple-500" },
                  { label: "PPC / Ads", value: ppc, total: totalCost, color: "bg-pink-500" },
                ].map(c => (
                  <div key={c.label}>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{c.label}</span>
                      <span>${c.value.toFixed(2)} ({totalCost > 0 ? ((c.value / totalCost) * 100).toFixed(0) : 0}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className={`h-full rounded-full ${c.color}`} style={{ width: `${totalCost > 0 ? (c.value / totalCost) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Viability Check */}
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" /> Viability Check
              </h3>
              <div className="space-y-2">
                {[
                  { label: "Profit Margin ≥ 30%", pass: parseFloat(margin) >= 30 },
                  { label: "ROI ≥ 100%", pass: parseFloat(roi) >= 100 },
                  { label: "Profit per Unit ≥ $10", pass: profit >= 10 },
                  { label: "Selling Price ≥ 3× Cost", pass: sp >= cost * 3 },
                ].map(c => (
                  <div key={c.label} className="flex items-center gap-2 text-sm">
                    {c.pass
                      ? <div className="w-4 h-4 rounded-full bg-green-100 border border-green-500/30 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-green-400 rounded-full" /></div>
                      : <AlertCircle className="w-4 h-4 text-red-600" />
                    }
                    <span className={c.pass ? "text-gray-500" : "text-gray-400"}>{c.label}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Scenarios */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" /> Scenario Analysis
          </h3>
          <p className="text-xs text-gray-500 mb-4">How profit changes across best/realistic/worst case assumptions</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Pessimistic", desc: "High costs, low price", spMul: 0.85, costMul: 1.15, ppcMul: 1.4, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
              { label: "Realistic", desc: "Current inputs", spMul: 1, costMul: 1, ppcMul: 1, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
              { label: "Optimistic", desc: "Lower costs, premium price", spMul: 1.15, costMul: 0.88, ppcMul: 0.7, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
            ].map(sc => {
              const adjSP = sp * sc.spMul;
              const adjCost = cost * sc.costMul;
              const adjPPC = ppc * sc.ppcMul;
              const { profit: p, margin: m, roi: r } = calcProfit(adjSP, adjCost, ship, duty, s2c, adjPPC, plat.feePercent, fbaFee);
              return (
                <div key={sc.label} className={`rounded-xl p-4 border ${sc.bg} ${sc.border}`}>
                  <p className={`text-sm font-bold ${sc.color} mb-0.5`}>{sc.label}</p>
                  <p className="text-xs text-gray-500 mb-3">{sc.desc}</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Sell Price</span>
                      <span className="font-semibold text-gray-800">${adjSP.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Net Profit/Unit</span>
                      <span className={`font-bold ${p >= 0 ? sc.color : "text-red-600"}`}>${p.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Margin</span>
                      <span className="font-semibold text-gray-700">{m}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">ROI</span>
                      <span className="font-semibold text-gray-700">{r}%</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t border-current border-opacity-20">
                      <span className="text-gray-500">Total ({u} units)</span>
                      <span className={`font-bold ${sc.color}`}>${(p * u).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

      </main>
    </div>
  );
}
