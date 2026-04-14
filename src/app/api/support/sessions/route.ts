import { NextResponse } from "next/server";
export const runtime = "nodejs";

import type { ChatSession } from "../chat/route";

const gs = globalThis as typeof globalThis & {
  __selloraChatSessions?: Map<string, ChatSession>;
};

// GET — return all sessions (agent dashboard)
export async function GET() {
  const sessions = gs.__selloraChatSessions ?? new Map<string, ChatSession>();
  const all = Array.from(sessions.values())
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return NextResponse.json({ sessions: all });
}

// DELETE — close a session
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const sessions = gs.__selloraChatSessions ?? new Map<string, ChatSession>();
  if (sessionId && sessions.has(sessionId)) {
    const s = sessions.get(sessionId)!;
    s.status = "closed";
    s.updatedAt = new Date().toISOString();
    sessions.set(sessionId, s);
  }
  return NextResponse.json({ ok: true });
}
