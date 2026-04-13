"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckSquare, Search, AlertTriangle, CheckCircle, XCircle, Zap, FileText } from "lucide-react";

const checkResult = {
  product: "Electric Neck Massager",
  hsCode: "9019.10.20",
  importDuty: "3.9%",
  restrictions: [],
  certifications: [
    { name: "FCC (USA)", required: true, status: "Required", note: "Electronic device — mandatory for USA" },
    { name: "CE (EU/UK)", required: true, status: "Required", note: "If selling to UK/EU markets" },
    { name: "RoHS", required: true, status: "Required", note: "Restriction of Hazardous Substances" },
    { name: "FDA", required: false, status: "Not Required", note: "Not a medical device" },
    { name: "UL Listed", required: false, status: "Optional", note: "Increases buyer trust" },
  ],
  amazonChecks: [
    { check: "FBA Hazmat", status: "Pass", note: "No lithium battery declared in listing" },
    { check: "Restricted Category", status: "Pass", note: "Health category — no gating required" },
    { check: "Brand Registry", status: "Warn", note: "Recommended for brand protection" },
    { check: "Image Policy", status: "Pass", note: "White background images required" },
    { check: "Title Character Limit", status: "Pass", note: "Amazon allows 200 chars max" },
  ],
  customs: [
    { market: "USA", duty: "3.9%", vat: "—", notes: "De minimis $800 (no duty under this)" },
    { market: "UK", duty: "3.7%", vat: "20%", notes: "Post-Brexit import rules apply" },
    { market: "EU", duty: "4.2%", vat: "20-25%", notes: "IOSS required for orders < €150" },
    { market: "Canada", duty: "0%", vat: "5% GST", notes: "CUSMA/USMCA — check COO" },
  ],
};

export default function CompliancePage() {
  const [query, setQuery] = useState("Electric Neck Massager");
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(true);

  function handleCheck() {
    setLoading(true);
    setTimeout(() => { setLoading(false); setChecked(true); }, 1400);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Compliance Checker" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Search */}
        <Card>
          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCheck()}
                placeholder='Enter product name e.g. "Electric Neck Massager", "LED flashlight"...'
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select className="bg-gray-100 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-500 focus:outline-none cursor-pointer">
                <option>USA Market</option>
                <option>UK Market</option>
                <option>EU Market</option>
                <option>Canada Market</option>
              </select>
              <Button onClick={handleCheck} loading={loading} size="sm">
                <Zap className="w-3.5 h-3.5" /> Check Now
              </Button>
            </div>
          </div>
        </Card>

        {checked && (
          <>
            {/* HS Code + Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "HS Code", value: checkResult.hsCode, color: "text-blue-600" },
                { label: "Import Duty (USA)", value: checkResult.importDuty, color: "text-amber-600" },
                { label: "Restrictions", value: "None", color: "text-green-600" },
                { label: "Certs Required", value: "3", color: "text-blue-600" },
              ].map(s => (
                <Card key={s.label} className="text-center py-4">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Certifications */}
              <Card className="lg:col-span-2">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" /> Required Certifications
                </h3>
                <div className="space-y-3">
                  {checkResult.certifications.map(c => (
                    <div key={c.name} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      {c.status === "Required"
                        ? <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        : c.status === "Optional"
                        ? <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        : <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      }
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-gray-900">{c.name}</p>
                          <Badge variant={c.status === "Required" ? "warning" : c.status === "Optional" ? "blue" : "success"}>{c.status}</Badge>
                        </div>
                        <p className="text-xs text-gray-500">{c.note}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Amazon Checks */}
                <h3 className="text-sm font-semibold text-gray-900 mt-5 mb-3 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-blue-600" /> Amazon Policy Checks
                </h3>
                <div className="space-y-2">
                  {checkResult.amazonChecks.map(c => (
                    <div key={c.check} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                      {c.status === "Pass"
                        ? <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                        : c.status === "Fail"
                        ? <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                        : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      }
                      <div className="flex-1">
                        <span className="text-sm text-gray-900">{c.check}</span>
                        <span className="text-xs text-gray-500 ml-2">{c.note}</span>
                      </div>
                      <Badge variant={c.status === "Pass" ? "success" : c.status === "Warn" ? "warning" : "danger"}>{c.status}</Badge>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Customs by Market */}
              <Card>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Customs by Market</h3>
                <div className="space-y-3">
                  {checkResult.customs.map(c => (
                    <div key={c.market} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-900">{c.market}</p>
                        <Badge variant="outline">Duty: {c.duty}</Badge>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>VAT/GST</span>
                        <span className="text-gray-500">{c.vat}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{c.notes}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
