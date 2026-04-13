"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Search, Star, CheckCircle, MessageSquare, ExternalLink, Zap, Shield, MapPin } from "lucide-react";

type Supplier = {
  name: string;
  location: string;
  country: "China" | "UK" | "USA" | "India" | "Vietnam";
  countryFlag: string;
  moq: number;
  unitCost: string;
  leadTime: string;
  rating: number;
  orders: number;
  verified: boolean;
  tradeAssurance: boolean;
  samples: string;
  tags: string[];
  speciality?: string;
};

const suppliers: Supplier[] = [
  {
    name: "Shenzhen Comfortlab Technology Co.",
    location: "Guangdong, China",
    country: "China",
    countryFlag: "🇨🇳",
    moq: 50,
    unitCost: "$6.20",
    leadTime: "12–15 days",
    rating: 4.8,
    orders: 2340,
    verified: true,
    tradeAssurance: true,
    samples: "$18",
    tags: ["Top Supplier", "Fast Ship"],
    speciality: "Health & Wellness devices",
  },
  {
    name: "Guangzhou Massager World Ltd.",
    location: "Guangdong, China",
    country: "China",
    countryFlag: "🇨🇳",
    moq: 100,
    unitCost: "$5.40",
    leadTime: "15–20 days",
    rating: 4.6,
    orders: 1870,
    verified: true,
    tradeAssurance: true,
    samples: "$15",
    tags: ["Best Price"],
    speciality: "Massagers & pain relief",
  },
  {
    name: "Yiwu Relax Health Products Co.",
    location: "Zhejiang, China",
    country: "China",
    countryFlag: "🇨🇳",
    moq: 30,
    unitCost: "$7.10",
    leadTime: "10–12 days",
    rating: 4.9,
    orders: 3120,
    verified: true,
    tradeAssurance: true,
    samples: "$20",
    tags: ["Top Supplier", "Low MOQ"],
    speciality: "Portable health gadgets",
  },
  {
    name: "Ningbo SmartTouch Electronics",
    location: "Zhejiang, China",
    country: "China",
    countryFlag: "🇨🇳",
    moq: 200,
    unitCost: "$4.80",
    leadTime: "18–25 days",
    rating: 4.4,
    orders: 980,
    verified: false,
    tradeAssurance: true,
    samples: "$12",
    tags: ["Bulk Only"],
    speciality: "Electronics accessories",
  },
  {
    name: "WellnessHub UK Wholesale",
    location: "Birmingham, United Kingdom",
    country: "UK",
    countryFlag: "🇬🇧",
    moq: 20,
    unitCost: "£14.50",
    leadTime: "2–4 days",
    rating: 4.7,
    orders: 640,
    verified: true,
    tradeAssurance: false,
    samples: "£25",
    tags: ["UK Warehouse", "Fast Ship", "Low MOQ"],
    speciality: "Health & lifestyle products — UK stock",
  },
  {
    name: "BrightPro Distribution Ltd.",
    location: "Manchester, United Kingdom",
    country: "UK",
    countryFlag: "🇬🇧",
    moq: 50,
    unitCost: "£12.80",
    leadTime: "3–5 days",
    rating: 4.5,
    orders: 410,
    verified: true,
    tradeAssurance: false,
    samples: "£22",
    tags: ["UK Warehouse", "Amazon UK Ready"],
    speciality: "FBA prep & Amazon UK fulfilment",
  },
  {
    name: "ProHealth Distributors Inc.",
    location: "Los Angeles, California, USA",
    country: "USA",
    countryFlag: "🇺🇸",
    moq: 25,
    unitCost: "$18.90",
    leadTime: "2–3 days",
    rating: 4.8,
    orders: 870,
    verified: true,
    tradeAssurance: false,
    samples: "$30",
    tags: ["USA Warehouse", "FBA Ready", "Low MOQ"],
    speciality: "Health & wellness — USA domestic stock",
  },
  {
    name: "NovaTech Supplies USA",
    location: "Dallas, Texas, USA",
    country: "USA",
    countryFlag: "🇺🇸",
    moq: 100,
    unitCost: "$16.40",
    leadTime: "3–5 days",
    rating: 4.6,
    orders: 530,
    verified: true,
    tradeAssurance: false,
    samples: "$28",
    tags: ["USA Warehouse", "Best Price"],
    speciality: "Consumer electronics & gadgets",
  },
  {
    name: "Rajasthan Wellness Exports",
    location: "Jaipur, India",
    country: "India",
    countryFlag: "🇮🇳",
    moq: 100,
    unitCost: "$3.90",
    leadTime: "18–22 days",
    rating: 4.3,
    orders: 760,
    verified: true,
    tradeAssurance: true,
    samples: "$10",
    tags: ["Best Price"],
    speciality: "Ayurvedic & wellness products",
  },
  {
    name: "Hanoi TechGoods Co.",
    location: "Hanoi, Vietnam",
    country: "Vietnam",
    countryFlag: "🇻🇳",
    moq: 50,
    unitCost: "$4.20",
    leadTime: "14–18 days",
    rating: 4.4,
    orders: 490,
    verified: true,
    tradeAssurance: true,
    samples: "$11",
    tags: ["Low Tariff"],
    speciality: "Electronics — low US tariff rate",
  },
];

const negotiationTemplate = `Subject: Inquiry for Neck Massager – MOQ & Pricing Discussion

Dear [Supplier Name],

I found your listing on Alibaba and am interested in sourcing your Electric Neck Massager (Model: [Model No.]).

I am an FBA seller on Amazon US and currently evaluating suppliers for a long-term partnership.

My requirements:
• Initial Order: 200 units
• Monthly Reorder: 500+ units (if quality is confirmed)
• Customization: Logo printing on product & packaging
• Certification: CE, FCC, RoHS required

Could you please provide:
1. Best price for 200 units and 500 units
2. Sample cost & delivery time
3. Available certifications
4. Lead time for bulk order

I look forward to your response.

Best regards,
[Your Name]
Sellora Commerce`;

const countryInfo: Record<string, { note: string; color: string }> = {
  All:     { note: "", color: "" },
  China:   { note: "🇨🇳 Lowest unit cost — ideal for large MOQ orders. Sea freight: 25–35 days. Air: 7–10 days.", color: "bg-red-50 border-red-200 text-red-700" },
  UK:      { note: "🇬🇧 UK-based stock — 2–5 day delivery. No import duty for Amazon UK FBA. VAT applies.", color: "bg-blue-50 border-blue-200 text-blue-700" },
  USA:     { note: "🇺🇸 USA domestic stock — 2–5 day FBA delivery. No import duty. Ideal for Amazon.com sellers.", color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
  India:   { note: "🇮🇳 Low cost, growing supplier base. Lead time 18–25 days. Good for niche wellness products.", color: "bg-orange-50 border-orange-200 text-orange-700" },
  Vietnam: { note: "🇻🇳 Low US tariff rate vs China. Lead time 15–22 days. Growing electronics manufacturing hub.", color: "bg-green-50 border-green-200 text-green-700" },
};

const tagVariant = (t: string) => {
  if (t === "Top Supplier") return "success";
  if (t === "Best Price") return "warning";
  if (t.includes("MOQ")) return "purple";
  if (t.includes("USA")) return "blue";
  if (t.includes("UK")) return "blue";
  if (t === "FBA Ready" || t === "Amazon UK Ready") return "success";
  if (t === "Low Tariff") return "purple";
  return "outline";
};

export default function SupplierFinderPage() {
  const [query, setQuery] = useState("neck massager");
  const [country, setCountry] = useState("All");
  const [loading, setLoading] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleSearch() {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  }

  function copyTemplate() {
    navigator.clipboard.writeText(negotiationTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const filtered = suppliers.filter(s =>
    country === "All" || s.country === country
  );

  const countries = ["All", "China", "UK", "USA", "India", "Vietnam"];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Supplier Finder" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Search */}
        <Card>
          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder='Search product e.g. "neck massager", "LED lamp"'
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <Button onClick={handleSearch} loading={loading} size="sm">
              <Zap className="w-3.5 h-3.5" /> Find Suppliers
            </Button>
          </div>

          {/* Country filter */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            {countries.map(c => (
              <button key={c} onClick={() => setCountry(c)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  country === c
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {c === "All" ? "All Countries" : `${c === "China" ? "🇨🇳" : c === "UK" ? "🇬🇧" : c === "USA" ? "🇺🇸" : c === "India" ? "🇮🇳" : "🇻🇳"} ${c}`}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400">{filtered.length} suppliers</span>
          </div>

          <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 flex-wrap">
            {[
              { label: "Trade Assurance only", val: true },
              { label: "Verified suppliers", val: true },
              { label: "Low MOQ (< 100 units)", val: false },
            ].map((f, i) => (
              <label key={i} className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" defaultChecked={f.val} className="accent-blue-600" />
                {f.label}
              </label>
            ))}
          </div>
        </Card>

        {/* Country info banner */}
        {country !== "All" && countryInfo[country].note && (
          <div className={`px-4 py-2.5 rounded-lg border text-xs font-medium ${countryInfo[country].color}`}>
            {countryInfo[country].note}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Supplier Cards */}
          <div className="lg:col-span-2 space-y-4">
            {filtered.length === 0 ? (
              <Card>
                <p className="text-sm text-gray-500 text-center py-6">No suppliers found for this filter.</p>
              </Card>
            ) : (
              filtered.map((s) => (
                <Card key={s.name} className="hover:border-blue-200 transition-colors hover:shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-base">{s.countryFlag}</span>
                        {s.tags.map(t => (
                          <Badge key={t} variant={tagVariant(t) as "success" | "warning" | "purple" | "blue" | "outline"}>{t}</Badge>
                        ))}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900">{s.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {s.location}
                      </p>
                      {s.speciality && (
                        <p className="text-xs text-blue-600 mt-0.5">{s.speciality}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-bold text-gray-900">{s.rating}</span>
                      </div>
                      <span className="text-xs text-gray-400">{s.orders.toLocaleString()} orders</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[
                      { label: "Unit Cost",  value: s.unitCost,          color: "text-green-600" },
                      { label: "Min Order",  value: `${s.moq} pcs`,      color: "text-blue-600" },
                      { label: "Lead Time",  value: s.leadTime,           color: "text-amber-600" },
                      { label: "Sample",     value: s.samples,            color: "text-blue-600" },
                    ].map(i => (
                      <div key={i.label} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                        <p className={`text-sm font-bold ${i.color}`}>{i.value}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{i.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      {s.verified && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3.5 h-3.5" /> Verified
                        </span>
                      )}
                      {s.tradeAssurance && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Shield className="w-3.5 h-3.5" /> Trade Assurance
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setShowTemplate(true)}>
                        <MessageSquare className="w-3.5 h-3.5" /> Negotiate
                      </Button>
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" /> MOQ Profit Calculator
              </h3>
              <div className="divide-y divide-gray-100">
                {[
                  { label: "Unit Cost (supplier)",   value: "$6.20",  color: "text-gray-600" },
                  { label: "Shipping to USA / unit",  value: "$1.80",  color: "text-gray-600" },
                  { label: "Import Duty",             value: "$0.50",  color: "text-gray-600" },
                  { label: "Amazon FBA Fee",          value: "$4.50",  color: "text-gray-600" },
                  { label: "Total Cost per Unit",     value: "$13.00", color: "text-amber-600" },
                  { label: "Selling Price",           value: "$34.99", color: "text-gray-600" },
                  { label: "Net Profit per Unit",     value: "$16.49", color: "text-green-600" },
                  { label: "ROI",                     value: "126.8%", color: "text-blue-600" },
                ].map(r => (
                  <div key={r.label} className={`flex justify-between py-2 text-xs ${["Total Cost per Unit","Net Profit per Unit","ROI"].includes(r.label) ? "font-semibold" : ""}`}>
                    <span className="text-gray-500">{r.label}</span>
                    <span className={r.color}>{r.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Country comparison */}
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Country Comparison</h3>
              <div className="space-y-2">
                {[
                  { flag: "🇨🇳", name: "China",   cost: "Lowest",  speed: "Slow",  duty: "3–25%" },
                  { flag: "🇬🇧", name: "UK",      cost: "High",    speed: "Fast",  duty: "0% (UK FBA)" },
                  { flag: "🇺🇸", name: "USA",     cost: "High",    speed: "Fast",  duty: "0% (domestic)" },
                  { flag: "🇮🇳", name: "India",   cost: "Low",     speed: "Slow",  duty: "Varies" },
                  { flag: "🇻🇳", name: "Vietnam", cost: "Low",     speed: "Medium",duty: "Low" },
                ].map(c => (
                  <div key={c.name} className="flex items-center gap-2 text-xs p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-base">{c.flag}</span>
                    <span className="font-medium text-gray-900 w-14">{c.name}</span>
                    <div className="flex gap-2 ml-auto text-gray-500">
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${c.cost === "Lowest" || c.cost === "Low" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{c.cost}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${c.speed === "Fast" ? "bg-blue-50 text-blue-700" : c.speed === "Medium" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"}`}>{c.speed}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Negotiation Template */}
            {showTemplate && (
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Negotiation Template</h3>
                  <Button size="sm" variant="secondary" onClick={copyTemplate}>
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <pre className="text-xs text-gray-500 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 overflow-y-auto max-h-60 leading-relaxed">
                  {negotiationTemplate}
                </pre>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
