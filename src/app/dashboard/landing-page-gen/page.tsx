"use client";
import { useState, useRef } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Search, AlertCircle, Plus, X, Download, Globe, ExternalLink, RefreshCw } from "lucide-react";

const COLORS = [
  { label: "Blue", value: "#2563eb" }, { label: "Purple", value: "#7c3aed" },
  { label: "Green", value: "#16a34a" }, { label: "Red", value: "#dc2626" },
  { label: "Orange", value: "#ea580c" }, { label: "Pink", value: "#db2777" },
  { label: "Slate", value: "#334155" }, { label: "Teal", value: "#0d9488" },
];

export default function LandingPageGenPage() {
  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("29.99");
  const [cta, setCta] = useState("Shop Now");
  const [color, setColor] = useState("#2563eb");
  const [featureInput, setFeatureInput] = useState("");
  const [features, setFeatures] = useState<string[]>(["Fast & lightweight", "Easy to use", "30-day guarantee"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  function addFeature() {
    const v = featureInput.trim();
    if (!v || features.length >= 6) return;
    setFeatures(f => [...f, v]); setFeatureInput("");
  }

  function removeFeature(f: string) { setFeatures(prev => prev.filter(x => x !== f)); }

  async function handleGenerate() {
    const p = product.trim();
    if (!p) return;
    setLoading(true); setError(null); setHtml(null); setPreview(false);
    try {
      const res = await fetch("/api/ai/landing-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: p, price, cta, color, features }),
      });
      const json = await res.json() as { html?: string; error?: string };
      if (!res.ok || !json.html) throw new Error(json.error ?? "Failed to generate");
      setHtml(json.html);
      setPreview(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  }

  function downloadHTML() {
    if (!html) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = `${product.replace(/\s+/g, "-").toLowerCase()}-landing-page.html`; a.click();
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Landing Page Generator" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Config Panel */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" /> Page Settings
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Product Name *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={product} onChange={e => setProduct(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleGenerate()}
                      placeholder='e.g. "Wireless Neck Massager"'
                      className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Price ($)</label>
                    <input value={price} onChange={e => setPrice(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">CTA Button</label>
                    <input value={cta} onChange={e => setCta(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-2 block">Brand Color</label>
                  <div className="flex flex-wrap gap-1.5">
                    {COLORS.map(c => (
                      <button key={c.value} onClick={() => setColor(c.value)} title={c.label}
                        className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-all ${color === c.value ? "border-gray-900 scale-110" : "border-transparent hover:scale-105"}`}
                        style={{ backgroundColor: c.value }} />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-2 block">Key Features ({features.length}/6)</label>
                  <div className="flex gap-2 mb-2">
                    <input value={featureInput} onChange={e => setFeatureInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addFeature()}
                      placeholder="Add a feature..." disabled={features.length >= 6}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                    <Button size="sm" variant="secondary" onClick={addFeature} disabled={features.length >= 6}><Plus className="w-3.5 h-3.5" /></Button>
                  </div>
                  <div className="space-y-1">
                    {features.map(f => (
                      <div key={f} className="flex items-center justify-between px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-lg">
                        <span className="text-xs text-gray-700">{f}</span>
                        <button onClick={() => removeFeature(f)} className="text-gray-400 hover:text-red-500 cursor-pointer"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
                </div>
              )}

              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-100">
                <Button onClick={handleGenerate} loading={loading} disabled={!product.trim()}>
                  <Zap className="w-4 h-4" /> Generate Landing Page
                </Button>
                {html && (
                  <>
                    <Button variant="secondary" onClick={downloadHTML}>
                      <Download className="w-4 h-4" /> Download HTML
                    </Button>
                    <Button variant="secondary" onClick={() => setPreview(p => !p)}>
                      <ExternalLink className="w-4 h-4" /> {preview ? "Hide Preview" : "Show Preview"}
                    </Button>
                    <Button variant="ghost" onClick={handleGenerate} disabled={loading}>
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                    </Button>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Preview */}
          <div className="lg:col-span-2">
            {loading && (
              <div className="flex items-center justify-center h-96 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Generating your landing page...</p>
                  <p className="text-xs text-gray-400 mt-1">This may take 10-20 seconds</p>
                </div>
              </div>
            )}

            {!loading && !html && (
              <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-center">
                <Globe className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-400">Your landing page will appear here</p>
                <p className="text-xs text-gray-400 mt-1">Fill in the settings and click Generate</p>
              </div>
            )}

            {!loading && html && preview && (
              <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border-b border-gray-200">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-white rounded border border-gray-200 px-3 py-0.5 text-xs text-gray-500 truncate">
                    {product} — AI Landing Page Preview
                  </div>
                </div>
                <iframe
                  ref={iframeRef}
                  srcDoc={html}
                  className="w-full h-[680px]"
                  title="Landing Page Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            )}

            {!loading && html && !preview && (
              <div className="flex flex-col items-center justify-center h-96 bg-green-50 rounded-xl border border-green-200">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                  <Globe className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm font-semibold text-green-800">Landing Page Generated!</p>
                <p className="text-xs text-green-600 mt-1 mb-4">Click Show Preview or Download HTML to use it</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setPreview(true)}><ExternalLink className="w-3.5 h-3.5" /> Preview</Button>
                  <Button size="sm" variant="secondary" onClick={downloadHTML}><Download className="w-3.5 h-3.5" /> Download</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
