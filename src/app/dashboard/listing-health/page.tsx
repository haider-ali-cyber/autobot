"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, AlertCircle, Plus, X, CheckCircle, TrendingUp } from "lucide-react";

interface HealthIssue { section: string; severity: "Critical" | "Warning" | "Suggestion"; current: string; fix: string; impact: string; }
interface HealthData { product: string; overallScore: number; grade: "A"|"B"|"C"|"D"|"F"; scores: { title: number; bullets: number; keywords: number; description: number; images: number; price: number }; issues: HealthIssue[]; strengths: string[]; topPriority: string; estimatedRankBoost: string; }

const SEV_CONFIG = {
  Critical: { variant: "danger" as const, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  Warning: { variant: "warning" as const, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  Suggestion: { variant: "blue" as const, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
};

const GRADE_COLOR = { A: "text-green-600 bg-green-50", B: "text-blue-600 bg-blue-50", C: "text-amber-600 bg-amber-50", D: "text-orange-600 bg-orange-50", F: "text-red-600 bg-red-50" };

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className={`font-bold ${score >= 80 ? "text-green-600" : score >= 60 ? "text-amber-600" : "text-red-600"}`}>{score}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function ListingHealthPage() {
  const [title, setTitle] = useState("");
  const [bullets, setBullets] = useState<string[]>(["", ""]);
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [price, setPrice] = useState("");
  const [imageCount, setImageCount] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HealthData | null>(null);

  function addBullet() { if (bullets.length < 5) setBullets(b => [...b, ""]); }
  function setBullet(i: number, v: string) { setBullets(prev => prev.map((b, idx) => idx === i ? v : b)); }
  function removeBullet(i: number) { setBullets(b => b.filter((_, idx) => idx !== i)); }

  async function handleAudit() {
    const t = title.trim();
    if (!t) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/ai/listing-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: t, title: t, bullets: bullets.filter(b => b.trim()), description, keywords, price, imageCount: parseInt(imageCount) || 0 }),
      });
      const json = await res.json() as HealthData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  }

  const criticalCount = data?.issues.filter(i => i.severity === "Critical").length ?? 0;
  const warningCount = data?.issues.filter(i => i.severity === "Warning").length ?? 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Listing Health Score" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Input */}
          <Card className="lg:col-span-2 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Product Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Full Amazon product title..."
                className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bullet Points ({bullets.length}/5)</label>
                {bullets.length < 5 && <button onClick={addBullet} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"><Plus className="w-3 h-3" /> Add</button>}
              </div>
              <div className="space-y-2">
                {bullets.map((b, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input value={b} onChange={e => setBullet(i, e.target.value)}
                      placeholder={`Bullet ${i + 1}...`}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    />
                    {bullets.length > 1 && <button onClick={() => removeBullet(i)} className="text-gray-300 hover:text-red-400 cursor-pointer"><X className="w-4 h-4" /></button>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="Product description..."
                className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Backend Keywords</label>
                <input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="keyword1, keyword2..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Price</label>
                <input value={price} onChange={e => setPrice(e.target.value)} placeholder="$29.99"
                  className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Number of Images</label>
              <select value={imageCount} onChange={e => setImageCount(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none cursor-pointer">
                {[0,1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n} image{n !== 1 ? "s" : ""}</option>)}
              </select>
            </div>

            {error && <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</div>}

            <Button onClick={handleAudit} loading={loading} disabled={!title.trim()}>
              <Zap className="w-4 h-4" /> Audit My Listing
            </Button>
          </Card>

          {/* Results */}
          <div className="lg:col-span-3 space-y-4">
            {loading && (
              <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-sm text-gray-500">Auditing your listing with AI...</span>
              </div>
            )}

            {!loading && !data && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                  <TrendingUp className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">Fill in your listing details and click Audit to get your Health Score.</p>
              </div>
            )}

            {!loading && data && (
              <>
                {/* Score Card */}
                <Card>
                  <div className="flex items-center gap-5">
                    <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center shrink-0 ${GRADE_COLOR[data.grade]}`}>
                      <p className="text-3xl font-black">{data.grade}</p>
                      <p className="text-xs font-medium opacity-70">{data.overallScore}/100</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 mb-1">{data.product}</p>
                      <div className="flex items-center gap-3 flex-wrap text-xs mb-2">
                        {criticalCount > 0 && <span className="text-red-600 font-semibold">{criticalCount} Critical</span>}
                        {warningCount > 0 && <span className="text-amber-600 font-semibold">{warningCount} Warning</span>}
                        <span className="text-green-600">{data.strengths.length} Strengths</span>
                        {data.estimatedRankBoost && <span className="text-blue-600">{data.estimatedRankBoost}</span>}
                      </div>
                      {data.topPriority && (
                        <p className="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                          <span className="font-semibold text-amber-700">Top Priority: </span>{data.topPriority}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
                    {Object.entries(data.scores).map(([k, v]) => (
                      <ScoreBar key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} score={v} />
                    ))}
                  </div>
                </Card>

                {/* Issues */}
                <div className="space-y-2">
                  {data.issues.map((issue, i) => {
                    const cfg = SEV_CONFIG[issue.severity];
                    return (
                      <Card key={i} className={`border ${cfg.border}`}>
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 mt-0.5">
                            <Badge variant={cfg.variant}>{issue.severity}</Badge>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-700 mb-1">{issue.section}</p>
                            <p className="text-xs text-gray-500 mb-1.5"><span className="font-medium text-gray-600">Issue:</span> {issue.current}</p>
                            <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1 mb-1"><span className="font-medium">Fix:</span> {issue.fix}</p>
                            <p className="text-xs text-blue-600 font-medium">{issue.impact}</p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Strengths */}
                {data.strengths.length > 0 && (
                  <Card>
                    <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> What&apos;s Working</p>
                    <ul className="space-y-1">
                      {data.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                          <span className="text-green-500 shrink-0">✓</span> {s}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
