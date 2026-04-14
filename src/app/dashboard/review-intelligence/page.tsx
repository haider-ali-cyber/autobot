"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Search, ThumbsUp, ThumbsDown, Zap, AlertCircle, CheckCircle, MessageSquare, Copy, CheckCheck } from "lucide-react";

interface Review {
  rating: number;
  title: string;
  text: string;
  author: string;
  date: string;
  verified: boolean;
  sentiment: string;
  category: string;
  insight: string;
}

interface Improvement {
  issue: string;
  frequency: number;
  priority: string;
  fix: string;
}

interface ReviewsData {
  productTitle: string;
  totalRatings: number;
  avgRating: number;
  reviews: Review[];
  improvements: Improvement[];
  positivePercent: number;
  negativePercent: number;
  mixedPercent: number;
  topFeatures: { feature: string; mentions: number }[];
}

export default function ReviewIntelligencePage() {
  const [asin, setAsin] = useState("B09XLMQQ7W");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReviewsData | null>(null);
  const [replies, setReplies] = useState<Record<number, string>>({});
  const [replyLoading, setReplyLoading] = useState<Record<number, boolean>>({});
  const [copiedReply, setCopiedReply] = useState<number | null>(null);

  async function fetchReviews() {
    const cleanAsin = asin.trim().toUpperCase();
    if (!cleanAsin) return;
    setLoading(true);
    setError(null);
    setData(null);
    setReplies({});
    try {
      const res = await fetch(`/api/research/reviews?asin=${encodeURIComponent(cleanAsin)}`);
      const json = await res.json() as ReviewsData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  }

  async function generateReply(index: number, reviewText: string, rating: number, sentiment: string) {
    setReplyLoading(p => ({ ...p, [index]: true }));
    try {
      const res = await fetch("/api/ai/review-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewText, rating, sentiment }),
      });
      const json = await res.json() as { reply?: string; error?: string };
      setReplies(p => ({ ...p, [index]: res.ok ? (json.reply ?? "") : (json.error ?? "Failed") }));
    } catch {
      setReplies(p => ({ ...p, [index]: "Network error — please try again" }));
    } finally {
      setReplyLoading(p => ({ ...p, [index]: false }));
    }
  }

  function copyReply(index: number) {
    navigator.clipboard.writeText(replies[index] ?? "");
    setCopiedReply(index);
    setTimeout(() => setCopiedReply(null), 1500);
  }

  const reviews = data?.reviews ?? [];
  const filtered = filter === "All" ? reviews : reviews.filter(r =>
    filter === "Positive" ? r.sentiment === "positive" :
    filter === "Negative" ? r.sentiment === "negative" : r.sentiment === "mixed"
  );
  const maxImp = Math.max(...(data?.improvements.map(i => i.frequency) ?? [1]));
  const maxFeat = Math.max(...(data?.topFeatures.map(f => f.mentions) ?? [1]));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Review Intelligence" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Search */}
        <Card>
          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input value={asin} onChange={e => setAsin(e.target.value)}
                onKeyDown={e => e.key === "Enter" && fetchReviews()}
                placeholder="Enter Amazon ASIN e.g. B09XLMQQ7W"
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <Button onClick={fetchReviews} loading={loading} size="sm">
              <Zap className="w-3.5 h-3.5" /> Analyze Reviews
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </div>
          )}

          {data && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-3 font-medium truncate">{data.productTitle} · ⭐ {data.avgRating} · {data.totalRatings.toLocaleString()} ratings</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Positive Reviews", count: `${data.positivePercent}%`, icon: ThumbsUp, color: "text-green-600", bg: "bg-green-50" },
                  { label: "Mixed Reviews", count: `${data.mixedPercent}%`, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
                  { label: "Negative Reviews", count: `${data.negativePercent}%`, icon: ThumbsDown, color: "text-red-600", bg: "bg-red-50" },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-lg p-3 flex items-center gap-3`}>
                    <s.icon className={`w-5 h-5 ${s.color} shrink-0`} />
                    <div>
                      <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
                      <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-gray-500">Fetching real Amazon reviews...</span>
          </div>
        )}

        {!loading && !data && !error && (
          <div className="text-center py-16 text-sm text-gray-400">
            Enter an Amazon ASIN and click Analyze Reviews to get real customer insights.
          </div>
        )}

        {!loading && data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Reviews */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {["All", "Positive", "Negative", "Mixed"].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${filter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-900"}`}
                  >{f}</button>
                ))}
                <span className="text-xs text-gray-400 ml-auto">{filtered.length} reviews · Live</span>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">No {filter.toLowerCase()} reviews found.</div>
              ) : (
                filtered.map((r, i) => (
                  <Card key={i} className="hover:border-gray-200 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-1 mb-0.5">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star key={j} className={`w-3.5 h-3.5 ${j < r.rating ? "text-amber-500 fill-amber-500" : "text-gray-300"}`} />
                          ))}
                          <span className="text-xs text-gray-500 ml-1">{r.rating}/5</span>
                        </div>
                        {r.title && <p className="text-xs font-semibold text-gray-700">{r.title}</p>}
                        <p className="text-xs text-gray-400">{r.author}{r.verified ? " · ✓ Verified" : ""}{r.date ? ` · ${r.date}` : ""}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0 ml-2">
                        <Badge variant={r.sentiment === "positive" ? "success" : r.sentiment === "negative" ? "danger" : "warning"}>
                          {r.sentiment}
                        </Badge>
                        <Badge variant="outline">{r.category}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-3 leading-relaxed">&quot;{r.text}&quot;</p>
                    <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-2.5 mb-3">
                      <Zap className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-600"><span className="font-semibold">Insight:</span> {r.insight}</p>
                    </div>
                    {replies[i] ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-semibold text-gray-700">AI-Generated Reply</p>
                          <button onClick={() => copyReply(i)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 cursor-pointer">
                            {copiedReply === i ? <><CheckCheck className="w-3.5 h-3.5 text-green-600" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">{replies[i]}</p>
                      </div>
                    ) : (
                      <button onClick={() => generateReply(i, r.text, r.rating, r.sentiment)}
                        disabled={replyLoading[i]}
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer disabled:opacity-50">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {replyLoading[i] ? "Generating reply…" : "Generate AI Reply"}
                      </button>
                    )}
                  </Card>
                ))
              )}
            </div>

            {/* Improvements + Top Features */}
            <div className="space-y-4">
              <Card>
                <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" /> Top Improvement Opportunities
                </h3>
                <p className="text-xs text-gray-500 mb-3">Based on negative review analysis</p>
                {data.improvements.length === 0 ? (
                  <p className="text-xs text-gray-400">No major issues detected.</p>
                ) : (
                  <div className="space-y-3">
                    {data.improvements.map(imp => (
                      <div key={imp.issue} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900">{imp.issue}</p>
                          <Badge variant={imp.priority === "High" ? "danger" : imp.priority === "Medium" ? "warning" : "outline"}>{imp.priority}</Badge>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{imp.frequency} mentions</p>
                        <div className="h-1 bg-gray-100 rounded-full mb-2">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${(imp.frequency / maxImp) * 100}%` }} />
                        </div>
                        <p className="text-xs text-green-600">→ {imp.fix}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {data.topFeatures.length > 0 && (
                <Card>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Most Loved Features</h3>
                  <div className="space-y-2">
                    {data.topFeatures.map(f => (
                      <div key={f.feature}>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{f.feature}</span><span>{f.mentions} mentions</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${(f.mentions / maxFeat) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
