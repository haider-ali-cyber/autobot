"use client";
import { useState } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rocket, Search, AlertCircle, Zap, CheckSquare, Square, Download, Flag } from "lucide-react";

interface ChecklistTask { task: string; category: string; priority: "Critical" | "High" | "Medium" | "Low"; timeEstimate: string; week: number; description: string; }
interface ChecklistData { product: string; platform: string; totalTasks: number; estimatedLaunchWeeks: number; tasks: ChecklistTask[]; launchTips: string[]; }

const PRIORITY_COLORS = {
  Critical: "danger" as const,
  High: "warning" as const,
  Medium: "blue" as const,
  Low: "outline" as const,
};

const CAT_COLORS: Record<string, string> = {
  Research: "bg-purple-100 text-purple-700",
  Listing: "bg-blue-100 text-blue-700",
  Inventory: "bg-amber-100 text-amber-700",
  Marketing: "bg-pink-100 text-pink-700",
  Launch: "bg-green-100 text-green-700",
  "Post-Launch": "bg-gray-100 text-gray-700",
};

const PLATFORMS = ["Amazon FBA", "Amazon FBM", "Shopify", "TikTok Shop", "Walmart", "eBay"];

export default function LaunchChecklistPage() {
  const [product, setProduct] = useState("");
  const [platform, setPlatform] = useState("Amazon FBA");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ChecklistData | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [activeWeek, setActiveWeek] = useState<number | "all">("all");

  async function handleGenerate() {
    const p = product.trim();
    if (!p) return;
    setLoading(true); setError(null); setChecked(new Set());
    try {
      const res = await fetch("/api/ai/launch-checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: p, platform }),
      });
      const json = await res.json() as ChecklistData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
      setActiveWeek("all");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setLoading(false); }
  }

  function toggleTask(i: number) {
    setChecked(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  }

  function exportChecklist() {
    if (!data) return;
    let text = `LAUNCH CHECKLIST: ${data.product}\nPlatform: ${data.platform}\nEstimated Launch: ${data.estimatedLaunchWeeks} weeks\n\n`;
    for (let w = 1; w <= data.estimatedLaunchWeeks; w++) {
      text += `\n═══ WEEK ${w} ═══\n`;
      data.tasks.filter(t => t.week === w).forEach(t => { text += `[ ] ${t.task} (${t.priority}) — ${t.timeEstimate}\n    ${t.description}\n\n`; });
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `launch-checklist-${data.product.replace(/\s+/g, "-")}.txt`; a.click();
  }

  const tasks = data?.tasks ?? [];
  const filtered = activeWeek === "all" ? tasks : tasks.filter(t => t.week === activeWeek);
  const weeks = data ? Array.from({ length: data.estimatedLaunchWeeks }, (_, i) => i + 1) : [];
  const completedCount = tasks.filter((_, i) => checked.has(i)).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Launch Checklist" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={product} onChange={e => setProduct(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGenerate()}
                placeholder='Product e.g. "Yoga Mat"'
                className="w-full bg-gray-50 border border-gray-200 rounded-md pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <select value={platform} onChange={e => setPlatform(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none cursor-pointer">
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
            <Button onClick={handleGenerate} loading={loading} size="sm">
              <Zap className="w-3.5 h-3.5" /> Generate Checklist
            </Button>
          </div>
          {error && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </div>
          )}
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-gray-500">Building your launch plan with AI...</span>
          </div>
        )}

        {!loading && !data && !error && (
          <div className="text-center py-16 text-sm text-gray-400">
            Enter a product and platform to generate a complete, week-by-week launch checklist.
          </div>
        )}

        {!loading && data && (
          <>
            {/* Progress */}
            <Card>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{data.product} — {data.platform}</p>
                  <p className="text-xs text-gray-400">{completedCount} / {tasks.length} tasks completed · {data.estimatedLaunchWeeks} week launch plan</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-blue-600">{progress}%</span>
                  <Button size="sm" variant="secondary" onClick={exportChecklist}><Download className="w-3.5 h-3.5" /> Export</Button>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
              {/* Tasks */}
              <div className="lg:col-span-3 space-y-3">
                {/* Week filter */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => setActiveWeek("all")}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${activeWeek === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-900"}`}>
                    All Weeks
                  </button>
                  {weeks.map(w => (
                    <button key={w} onClick={() => setActiveWeek(w)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${activeWeek === w ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-900"}`}>
                      Week {w}
                    </button>
                  ))}
                </div>

                {filtered.map((task, i) => {
                  const origIdx = tasks.indexOf(task);
                  const done = checked.has(origIdx);
                  return (
                    <div key={origIdx} onClick={() => toggleTask(origIdx)}
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${done ? "bg-gray-50 border-gray-200 opacity-60" : "bg-white border-gray-200 hover:border-blue-300"}`}>
                      <div className="mt-0.5 shrink-0 text-gray-400">
                        {done ? <CheckSquare className="w-4 h-4 text-green-600" /> : <Square className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className={`text-sm font-medium ${done ? "line-through text-gray-400" : "text-gray-900"}`}>{task.task}</p>
                          <Badge variant={PRIORITY_COLORS[task.priority]}>{task.priority}</Badge>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${CAT_COLORS[task.category] ?? "bg-gray-100 text-gray-600"}`}>{task.category}</span>
                        </div>
                        <p className="text-xs text-gray-500">{task.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>Week {task.week}</span>
                          <span>⏱ {task.timeEstimate}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tips */}
              <div className="space-y-4">
                <Card>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Flag className="w-4 h-4 text-blue-600" /> Launch Tips
                  </h3>
                  <ul className="space-y-2.5">
                    {data.launchTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">{i + 1}</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card className="bg-amber-50 border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1"><Rocket className="w-3.5 h-3.5" /> Progress Tracking</p>
                  <p className="text-xs text-amber-600">Click any task to mark it complete. Your progress is saved for this session.</p>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
