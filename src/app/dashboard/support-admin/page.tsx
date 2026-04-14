"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Headphones, Send, CheckCircle, RefreshCw, Circle } from "lucide-react";

interface ChatMessage { id: string; sender: "user" | "bot" | "agent"; text: string; timestamp: string; }
interface ChatSession { id: string; status: "bot" | "waiting" | "agent" | "closed"; messages: ChatMessage[]; userLabel: string; createdAt: string; updatedAt: string; agentRead: boolean; }

const STATUS_LABEL: Record<string, string> = { bot: "With Bot", waiting: "Waiting", agent: "With Agent", closed: "Closed" };
const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "outline" | "blue"> = { bot: "blue", waiting: "warning", agent: "success", closed: "outline" };

function fmt(ts: string) { return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function fmtDate(ts: string) { return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }

export default function SupportAdminPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const bottomRef = useRef<HTMLDivElement>(null);

  const selectedSession = sessions.find(s => s.id === selected) ?? null;

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/support/sessions");
      const data = await res.json() as { sessions: ChatSession[] };
      setSessions(data.sessions);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchSessions();
    const iv = setInterval(fetchSessions, 3000);
    return () => clearInterval(iv);
  }, [fetchSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedSession?.messages.length]);

  async function joinSession(sessionId: string) {
    setSending(true);
    try {
      const res = await fetch("/api/support/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, action: "join" }) });
      const data = await res.json() as { session: ChatSession };
      setSessions(prev => prev.map(s => s.id === sessionId ? data.session : s));
      setSelected(sessionId);
    } finally { setSending(false); }
  }

  async function closeSession(sessionId: string) {
    try {
      await fetch("/api/support/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, action: "close" }) });
      await fetchSessions();
    } catch { /* silent */ }
  }

  async function sendReply() {
    if (!reply.trim() || !selected || sending) return;
    setSending(true);
    const text = reply.trim();
    setReply("");
    try {
      const res = await fetch("/api/support/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: selected, text }) });
      const data = await res.json() as { session: ChatSession };
      setSessions(prev => prev.map(s => s.id === selected ? data.session : s));
    } finally { setSending(false); }
  }

  const filtered = sessions.filter(s => filter === "all" || s.status === filter);
  const waitingCount = sessions.filter(s => s.status === "waiting").length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Support Agent Dashboard" />
      <main className="flex-1 overflow-hidden p-4">
        <div className="h-full flex gap-4">
          {/* Session List */}
          <div className="w-[280px] shrink-0 flex flex-col gap-3">
            <Card className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-700">{sessions.length} conversations</p>
                <button onClick={fetchSessions} className="p-1 hover:bg-gray-100 rounded cursor-pointer"><RefreshCw className="w-3.5 h-3.5 text-gray-400" /></button>
              </div>
              <div className="flex gap-1 flex-wrap">
                {[
                  { key: "all", label: "All" },
                  { key: "waiting", label: `Waiting ${waitingCount > 0 ? `(${waitingCount})` : ""}` },
                  { key: "agent", label: "Active" },
                  { key: "bot", label: "Bot" },
                  { key: "closed", label: "Closed" },
                ].map(f => (
                  <button key={f.key} onClick={() => setFilter(f.key)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${filter === f.key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-800"} ${f.key === "waiting" && waitingCount > 0 ? "ring-1 ring-amber-400" : ""}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </Card>

            <div className="flex-1 overflow-y-auto space-y-2">
              {filtered.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-400">No conversations yet</div>
              )}
              {filtered.map(s => (
                <button key={s.id} onClick={() => setSelected(s.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${selected === s.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"} ${s.status === "waiting" && !s.agentRead ? "ring-1 ring-amber-400" : ""}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-800 truncate">{s.userLabel}</p>
                    <Badge variant={STATUS_VARIANT[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{s.messages[s.messages.length - 1]?.text ?? "No messages"}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{fmtDate(s.updatedAt)}</p>
                  {s.status === "waiting" && !s.agentRead && (
                    <div className="flex items-center gap-1 mt-1 text-amber-600 text-[10px] font-semibold">
                      <Circle className="w-2.5 h-2.5 fill-amber-500" /> Needs agent
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Chat View */}
          <div className="flex-1 flex flex-col min-w-0">
            {!selectedSession ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Headphones className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Select a conversation to view and reply</p>
                  {waitingCount > 0 && (
                    <p className="text-xs text-amber-600 font-medium mt-1">{waitingCount} customer{waitingCount > 1 ? "s" : ""} waiting for agent</p>
                  )}
                </div>
              </div>
            ) : (
              <Card className="flex-1 flex flex-col overflow-hidden p-0">
                {/* Chat header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{selectedSession.userLabel}</p>
                      <p className="text-xs text-gray-400">{selectedSession.messages.length} messages · {fmtDate(selectedSession.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANT[selectedSession.status]}>{STATUS_LABEL[selectedSession.status]}</Badge>
                    {selectedSession.status === "waiting" && (
                      <button onClick={() => joinSession(selectedSession.id)} disabled={sending}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 cursor-pointer disabled:opacity-50">
                        Join Chat
                      </button>
                    )}
                    {selectedSession.status === "agent" && (
                      <button onClick={() => closeSession(selectedSession.id)}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300 cursor-pointer flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Close
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {selectedSession.messages.map(msg => (
                    <div key={msg.id} className={`flex gap-2 ${msg.sender === "user" ? "flex-row" : "flex-row-reverse"}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.sender === "user" ? "bg-blue-100" : msg.sender === "agent" ? "bg-green-600" : "bg-gray-300"}`}>
                        {msg.sender === "user" ? <User className="w-3.5 h-3.5 text-blue-600" /> : msg.sender === "agent" ? <Headphones className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-gray-500" />}
                      </div>
                      <div className={`max-w-[70%] flex flex-col ${msg.sender === "user" ? "items-start" : "items-end"}`}>
                        <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${msg.sender === "user" ? "bg-white border border-gray-200 text-gray-800 rounded-tl-none" : msg.sender === "agent" ? "bg-green-600 text-white rounded-tr-none" : "bg-blue-50 border border-blue-100 text-gray-700 rounded-tr-none"}`}>
                          {msg.text}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 px-1 flex items-center gap-1">
                          {msg.sender === "bot" ? "Bot" : msg.sender === "agent" ? "Agent (You)" : "Customer"} · {fmt(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Reply */}
                {selectedSession.status === "agent" && (
                  <div className="p-3 bg-white border-t border-gray-200 shrink-0 flex gap-2">
                    <input value={reply} onChange={e => setReply(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                      placeholder="Type reply..."
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-500"
                    />
                    <button onClick={sendReply} disabled={!reply.trim() || sending}
                      className="p-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 cursor-pointer">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {selectedSession.status === "waiting" && (
                  <div className="p-3 text-center text-xs text-amber-600 bg-amber-50 border-t border-amber-200 shrink-0">
                    Click <strong>Join Chat</strong> above to start replying to this customer.
                  </div>
                )}
                {selectedSession.status === "closed" && (
                  <div className="p-3 text-center text-xs text-gray-400 bg-gray-50 border-t border-gray-200 shrink-0">This conversation is closed.</div>
                )}
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
