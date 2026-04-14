import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

import type { ChatSession, ChatMessage } from "../chat/route";

const gs = globalThis as typeof globalThis & {
  __selloraChatSessions?: Map<string, ChatSession>;
};

function genId() { return Math.random().toString(36).slice(2, 11); }

// POST — agent sends a message or joins a session
export async function POST(req: NextRequest) {
  const sessions = gs.__selloraChatSessions ?? new Map<string, ChatSession>();
  const body = await req.json().catch(() => ({})) as { sessionId?: string; text?: string; action?: "join" | "close" };
  const { sessionId, text, action } = body;
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  const session = sessions.get(sessionId);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  if (action === "join") {
    session.status = "agent";
    session.agentRead = true;
    const joinMsg: ChatMessage = {
      id: genId(),
      sender: "agent",
      text: "✅ A support agent has joined the chat. How can I help you?",
      timestamp: new Date().toISOString(),
    };
    session.messages.push(joinMsg);
    session.updatedAt = new Date().toISOString();
    sessions.set(sessionId, session);
    return NextResponse.json({ session });
  }

  if (action === "close") {
    const closeMsg: ChatMessage = {
      id: genId(),
      sender: "agent",
      text: "This chat has been closed by the agent. Thank you for contacting Sellora support! 👋",
      timestamp: new Date().toISOString(),
    };
    session.messages.push(closeMsg);
    session.status = "closed";
    session.updatedAt = new Date().toISOString();
    sessions.set(sessionId, session);
    return NextResponse.json({ session });
  }

  if (!text?.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });

  // Agent sends message
  session.status = "agent";
  const agentMsg: ChatMessage = {
    id: genId(),
    sender: "agent",
    text: text.trim(),
    timestamp: new Date().toISOString(),
  };
  session.messages.push(agentMsg);
  session.updatedAt = new Date().toISOString();
  sessions.set(sessionId, session);
  return NextResponse.json({ session });
}
