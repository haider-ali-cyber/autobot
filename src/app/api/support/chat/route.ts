import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

export interface ChatMessage {
  id: string;
  sender: "user" | "bot" | "agent";
  text: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  status: "bot" | "waiting" | "agent" | "closed";
  messages: ChatMessage[];
  language: string;
  createdAt: string;
  updatedAt: string;
  userLabel: string;
  agentRead: boolean;
}

const gs = globalThis as typeof globalThis & {
  __selloraChatSessions?: Map<string, ChatSession>;
};
const sessions = gs.__selloraChatSessions ?? new Map<string, ChatSession>();
gs.__selloraChatSessions = sessions;

function genId() { return Math.random().toString(36).slice(2, 11); }

const ESCALATION_PATTERNS = [
  /\b(agent|human|person|staff|support\s*team|real\s*person|live\s*chat|speak\s*to|talk\s*to|connect\s*me|transfer)\b/i,
  /\b(انسان|ایجنٹ|بندہ|آدمی|سپورٹ)\b/,
  /\b(منتقل|ایجنٹ سے بات|انسان سے بات)\b/,
  /\b(insan|agent|destek|canlı|gerçek)\b/i,
  /\b(humain|vrai|personne|agent|transfert)\b/i,
  /\b(mensch|agent|mitarbeiter|weiterleiten)\b/i,
  /\b(人間|エージェント|サポート担当者)\b/,
  /\b(人工|客服|转接|真人)\b/,
];

function isEscalation(text: string): boolean {
  return ESCALATION_PATTERNS.some(p => p.test(text));
}

const SELLORA_CONTEXT = `You are Sellora's friendly customer support AI assistant. Sellora is an all-in-one Amazon & e-commerce seller platform.

Sellora Features you can help with:
- Product Research (live Amazon data, 10 marketplaces: US,UK,DE,CA,JP,AU,IN,FR,ES,IT)
- Keyword Research (opportunity score, intent tags, clustering, reverse ASIN)
- Trend Predictor (AI trend analysis)
- Competitor Spy (ASIN analysis)
- Review Intelligence (AI review analysis)
- Ad Intelligence (Facebook ad spy)
- Listing Generator (AI listing for Amazon/Shopify/TikTok)
- Listing Health Score (A-F grade + specific fixes)
- A+ Content Generator (enhanced brand content)
- Launch Studio (multi-platform content)
- PPC Builder (AI campaign structure)
- Email Sequences (4-email AI flows)
- AI Ad Creator (product photo + ad copy)
- Supplier Finder (AI supplier discovery)
- Profit Calculator (with scenarios)
- Inventory Planner (smart reorder alerts)
- Pricing Strategy (competitor pricing, buy box tips)
- Bundle Finder (AI bundle ideas)
- Compliance Check (AI market compliance)
- Brand Protection (threat detection)
- Launch Checklist (week-by-week tasks)
- Landing Page Generator (full HTML)
- Product Risk Analyzer (Go/No-Go verdict)

Rules:
1. DETECT the language the user writes in and ALWAYS reply in THAT SAME LANGUAGE
2. Be helpful, friendly, and concise
3. If you cannot resolve their issue, politely tell them you'll connect them to a human agent
4. NEVER make up pricing or subscription details — say "please check our pricing page"
5. Keep responses under 4 sentences unless explaining a feature step by step`;

const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];

async function getBotReply(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "I'm having trouble connecting right now. Please try again or request a human agent.";

  const history = messages.slice(-8).map(m => ({
    role: m.sender === "user" ? "user" : "model",
    parts: [{ text: m.text }],
  })).filter(m => m.role === "user" || m.role === "model");

  const contents = [
    { role: "user", parts: [{ text: SELLORA_CONTEXT + "\n\nNow help the user:" }] },
    { role: "model", parts: [{ text: "Understood! I'm ready to help Sellora users in any language." }] },
    ...history,
  ];

  for (const model of MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, generationConfig: { temperature: 0.4, maxOutputTokens: 400 } }),
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) continue;
      const d = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) return text;
    } catch { continue; }
  }
  return "I'm having a bit of trouble right now. Would you like to speak with a human agent?";
}

// GET — fetch session messages
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  const session = sessions.get(sessionId);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json({ session });
}

// POST — user sends a message
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { sessionId?: string; text?: string; userLabel?: string };
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  let session: ChatSession;
  if (body.sessionId && sessions.has(body.sessionId)) {
    session = sessions.get(body.sessionId)!;
  } else {
    session = {
      id: genId(),
      status: "bot",
      messages: [],
      language: "en",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userLabel: body.userLabel ?? `User #${genId().slice(0, 4).toUpperCase()}`,
      agentRead: false,
    };
    sessions.set(session.id, session);
  }

  // Add user message
  const userMsg: ChatMessage = { id: genId(), sender: "user", text, timestamp: new Date().toISOString() };
  session.messages.push(userMsg);
  session.updatedAt = new Date().toISOString();
  session.agentRead = false;

  let botReply: ChatMessage | null = null;

  // If already with agent → just store, agent will reply
  if (session.status === "agent") {
    sessions.set(session.id, session);
    return NextResponse.json({ session, escalated: false });
  }

  // Check escalation
  if (isEscalation(text) || session.status === "waiting") {
    session.status = "waiting";
    botReply = {
      id: genId(),
      sender: "bot",
      text: "I'm connecting you to a human agent now. Please hold on — an agent will join shortly. 🔄",
      timestamp: new Date().toISOString(),
    };
    session.messages.push(botReply);
    sessions.set(session.id, session);
    return NextResponse.json({ session, escalated: true });
  }

  // Bot responds
  const reply = await getBotReply(session.messages);
  botReply = { id: genId(), sender: "bot", text: reply, timestamp: new Date().toISOString() };
  session.messages.push(botReply);
  sessions.set(session.id, session);

  return NextResponse.json({ session, escalated: false });
}
