"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, Minimize2, Bot, User, Headphones, RefreshCw } from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "bot" | "agent";
  text: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  status: "bot" | "waiting" | "agent" | "closed";
  messages: ChatMessage[];
  userLabel: string;
}

const STORAGE_KEY = "sellora_chat_session_id";

const STATUS_LABEL: Record<string, string> = {
  bot: "Sellora AI", waiting: "Connecting to agent...", agent: "Support Agent", closed: "Chat Closed",
};

const STATUS_COLOR: Record<string, string> = {
  bot: "bg-blue-500", waiting: "bg-amber-500 animate-pulse", agent: "bg-green-500", closed: "bg-gray-400",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSession = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/support/chat?sessionId=${sid}`);
      if (!res.ok) return;
      const data = await res.json() as { session: ChatSession };
      setSession(prev => {
        const newLen = data.session.messages.length;
        const oldLen = prev?.messages.length ?? 0;
        if (!open && newLen > oldLen) setUnread(u => u + (newLen - oldLen));
        return data.session;
      });
    } catch { /* silent */ }
  }, [open]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) { setSessionId(stored); setStarted(true); fetchSession(stored); }
  }, [fetchSession]);

  useEffect(() => {
    if (!sessionId) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchSession(sessionId), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [sessionId, fetchSession]);

  useEffect(() => {
    if (open) { setUnread(0); }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, session?.messages.length]);

  async function startChat() {
    setStarted(true);
    setSession({
      id: "", status: "bot",
      messages: [{ id: "w", sender: "bot", text: "Hi! I'm Sellora's AI support. I can help in any language.\n\nType your question or say 'agent' to speak with a human. 👋", timestamp: new Date().toISOString() }],
      userLabel: "You",
    });
  }

  async function doSend(text: string) {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, text: text.trim(), userLabel: "User" }),
      });
      const data = await res.json() as { session: ChatSession };
      setSession(data.session);
      if (!sessionId) {
        setSessionId(data.session.id);
        localStorage.setItem(STORAGE_KEY, data.session.id);
      }
    } catch { /* silent */ }
    finally { setSending(false); }
  }

  function sendMessage() { doSend(input); setInput(""); }
  function requestAgent() { doSend("I want to speak with a human agent please."); }

  function resetChat() {
    localStorage.removeItem(STORAGE_KEY);
    setSessionId(null); setSession(null); setStarted(false); setUnread(0);
    if (pollRef.current) clearInterval(pollRef.current);
  }

  function fmt(ts: string) { return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

  const isClosed = session?.status === "closed";
  const isWaiting = session?.status === "waiting";

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && !minimized && (
        <div className="w-[340px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ height: "480px" }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white shrink-0">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                {session?.status === "agent" ? <Headphones className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-blue-600 ${STATUS_COLOR[session?.status ?? "bot"]}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Sellora Support</p>
              <p className="text-xs text-blue-100">{STATUS_LABEL[session?.status ?? "bot"]}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={resetChat} title="New chat" className="p-1.5 hover:bg-white/20 rounded-lg cursor-pointer"><RefreshCw className="w-3.5 h-3.5" /></button>
              <button onClick={() => setMinimized(true)} className="p-1.5 hover:bg-white/20 rounded-lg cursor-pointer"><Minimize2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg cursor-pointer"><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {!started ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-3">
                  <Bot className="w-7 h-7 text-blue-600" />
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Sellora Support</p>
                <p className="text-xs text-gray-500 mb-4">AI-powered support in any language. Connect to human agent anytime.</p>
                <button onClick={startChat} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 cursor-pointer">
                  Start Chat
                </button>
              </div>
            ) : (
              <>
                {session?.messages.map(msg => (
                  <div key={msg.id} className={`flex gap-2 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.sender === "user" ? "bg-blue-600" : msg.sender === "agent" ? "bg-green-600" : "bg-gray-200"}`}>
                      {msg.sender === "user" ? <User className="w-3.5 h-3.5 text-white" /> : msg.sender === "agent" ? <Headphones className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-gray-500" />}
                    </div>
                    <div className={`max-w-[78%] flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                      <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${msg.sender === "user" ? "bg-blue-600 text-white rounded-tr-none" : msg.sender === "agent" ? "bg-green-50 border border-green-200 text-gray-800 rounded-tl-none" : "bg-white border border-gray-200 text-gray-700 rounded-tl-none"}`}>
                        {msg.text}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 px-1">{fmt(msg.timestamp)}</p>
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0"><Bot className="w-3.5 h-3.5 text-gray-500" /></div>
                    <div className="bg-white border border-gray-200 rounded-xl rounded-tl-none px-3 py-2.5">
                      <div className="flex gap-1">
                        {[0, 150, 300].map(d => <div key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          {started && !isClosed && (
            <div className="p-3 bg-white border-t border-gray-200 shrink-0">
              {!isWaiting && session?.status !== "agent" && (
                <button onClick={requestAgent} className="w-full mb-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 hover:text-blue-600 hover:border-blue-300 cursor-pointer flex items-center justify-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5" /> Talk to Human Agent
                </button>
              )}
              {isWaiting && (
                <div className="mb-2 text-center text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" /> Waiting for an agent to join...
                </div>
              )}
              <div className="flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={isWaiting ? "Agent joining soon..." : "Type a message..."}
                  disabled={isWaiting || sending}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
                <button onClick={sendMessage} disabled={!input.trim() || sending || isWaiting}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {isClosed && (
            <div className="p-3 bg-gray-50 border-t border-gray-200 text-center shrink-0">
              <p className="text-xs text-gray-500 mb-2">Chat ended</p>
              <button onClick={resetChat} className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 cursor-pointer">Start New Chat</button>
            </div>
          )}
        </div>
      )}

      {/* Minimized bar */}
      {open && minimized && (
        <div onClick={() => setMinimized(false)} className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg cursor-pointer">
          <Bot className="w-4 h-4" />
          <span className="text-sm font-medium">Sellora Support</span>
          <span className={`w-2 h-2 rounded-full ${STATUS_COLOR[session?.status ?? "bot"]}`} />
        </div>
      )}

      {/* Toggle Button */}
      <button onClick={() => { setOpen(o => !o); setMinimized(false); setUnread(0); }}
        className="w-13 h-13 w-[52px] h-[52px] bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-all hover:scale-105 relative">
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </div>
  );
}
