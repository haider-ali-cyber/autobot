"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Search, ThumbsUp, ThumbsDown, Zap, AlertCircle, CheckCircle, MessageSquare, Copy, CheckCheck } from "lucide-react";

const reviews = [
  { rating: 1, text: "The heat function stops working after 2 weeks. Very disappointed with the quality.", sentiment: "negative", category: "Quality", insight: "Heat durability issue — improve PCB heat protection" },
  { rating: 2, text: "Too noisy for office use. My colleagues kept looking at me. The massage is okay though.", sentiment: "negative", category: "Noise", insight: "Motor noise is a key complaint — target quieter motor" },
  { rating: 5, text: "Best neck massager I've ever used! The heat + massage combo is perfect for my herniated disc.", sentiment: "positive", category: "Effectiveness", insight: "Heat + massage combo is the #1 selling point" },
  { rating: 1, text: "The charging port broke after 3 weeks. USB-C feels very flimsy. Not worth $40.", sentiment: "negative", category: "Build Quality", insight: "USB-C port fragility — reinforce or upgrade to magnetic charging" },
  { rating: 4, text: "Works great but the strap is a bit short for bigger necks. Would love an adjustable version.", sentiment: "mixed", category: "Fit", insight: "Size inclusivity gap — add adjustable strap option" },
  { rating: 5, text: "I use this daily at my desk. Neck pain completely gone after 2 weeks. Life changing product!", sentiment: "positive", category: "Effectiveness", insight: "Daily office use is the primary use case — target office workers" },
  { rating: 3, text: "Good massager but the instructions are only in Chinese. Very confusing to set up.", sentiment: "mixed", category: "Instructions", insight: "Missing English manual — add multilingual documentation" },
  { rating: 2, text: "Battery life is terrible. Only lasts 45 minutes. My old one lasted 3 hours.", sentiment: "negative", category: "Battery Life", insight: "Upgrade to 3000mAh battery — major competitive gap" },
];

const improvements = [
  { issue: "Heat Durability", frequency: 34, priority: "High", fix: "Upgrade heat circuit protection" },
  { issue: "Motor Noise Level", frequency: 28, priority: "High", fix: "Switch to brushless motor supplier" },
  { issue: "Battery Life", frequency: 22, priority: "High", fix: "Upgrade to 3000mAh battery" },
  { issue: "USB-C Port Quality", frequency: 19, priority: "Medium", fix: "Magnetic charging port alternative" },
  { issue: "Strap Adjustability", frequency: 14, priority: "Medium", fix: "Add size M/L/XL strap options" },
];

export default function ReviewIntelligencePage() {
  const [asin, setAsin] = useState("B09XLMQQ7W");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [replies, setReplies] = useState<Record<number, string>>({});
  const [replyLoading, setReplyLoading] = useState<Record<number, boolean>>({});
  const [copiedReply, setCopiedReply] = useState<number | null>(null);

  async function generateReply(index: number, reviewText: string, rating: number, sentiment: string) {
    setReplyLoading(p => ({ ...p, [index]: true }));
    try {
      const res = await fetch("/api/ai/review-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewText, rating, sentiment }),
      });
      const data = await res.json();
      setReplies(p => ({ ...p, [index]: res.ok ? data.reply : (data.error ?? "Failed to generate reply") }));
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

  const filtered = filter === "All" ? reviews : reviews.filter(r =>
    filter === "Positive" ? r.sentiment === "positive" :
    filter === "Negative" ? r.sentiment === "negative" : r.sentiment === "mixed"
  );

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
                placeholder="Enter competitor ASIN or product URL..."
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <Button onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1200); }} loading={loading} size="sm">
              <Zap className="w-3.5 h-3.5" /> Analyze Reviews
            </Button>
          </div>

          {/* Sentiment Summary */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: "Positive Reviews", count: "68%", icon: ThumbsUp, color: "text-green-600", bg: "bg-green-50" },
              { label: "Mixed Reviews", count: "18%", icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Negative Reviews", count: "14%", icon: ThumbsDown, color: "text-red-600", bg: "bg-red-50" },
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
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Reviews */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {["All", "Positive", "Negative", "Mixed"].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${filter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-900"}`}
                >{f}</button>
              ))}
              <span className="text-xs text-gray-400 ml-auto">{filtered.length} reviews</span>
            </div>

            {filtered.map((r, i) => (
              <Card key={i} className="hover:border-gray-200 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className={`w-3.5 h-3.5 ${j < r.rating ? "text-amber-500 fill-amber-500" : "text-gray-300"}`} />
                    ))}
                    <span className="text-xs text-gray-500 ml-1">{r.rating}/5</span>
                  </div>
                  <div className="flex gap-1.5">
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

                {/* AI Reply Section */}
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
                  <button
                    onClick={() => generateReply(i, r.text, r.rating, r.sentiment)}
                    disabled={replyLoading[i]}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer disabled:opacity-50"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {replyLoading[i] ? "Generating reply…" : "Generate AI Reply"}
                  </button>
                )}
              </Card>
            ))}
          </div>

          {/* Improvements */}
          <div className="space-y-4">
            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" /> Top Improvement Opportunities
              </h3>
              <p className="text-xs text-gray-500 mb-3">Based on negative review analysis</p>
              <div className="space-y-3">
                {improvements.map(imp => (
                  <div key={imp.issue} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900">{imp.issue}</p>
                      <Badge variant={imp.priority === "High" ? "danger" : "warning"}>{imp.priority}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{imp.frequency} mentions in reviews</p>
                    <div className="h-1 bg-gray-100 rounded-full mb-2">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${(imp.frequency / 34) * 100}%` }} />
                    </div>
                    <p className="text-xs text-green-600">→ {imp.fix}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Most Loved Features</h3>
              <div className="space-y-2">
                {[
                  { feature: "Heat therapy combo", mentions: 89 },
                  { feature: "Portability", mentions: 71 },
                  { feature: "Easy to use", mentions: 64 },
                  { feature: "Pain relief speed", mentions: 58 },
                  { feature: "Gift-worthy packaging", mentions: 34 },
                ].map(f => (
                  <div key={f.feature}>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{f.feature}</span><span>{f.mentions} mentions</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${(f.mentions / 89) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
