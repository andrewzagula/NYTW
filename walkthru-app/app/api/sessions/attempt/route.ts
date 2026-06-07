import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { recordAttempt, getSession } from "@/lib/db";

export async function POST(request: NextRequest) {
  let body: { sessionId?: string; question?: string; correct?: boolean; hint?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sessionId, question, correct, hint } = body;
  if (!sessionId || question === undefined || correct === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await recordAttempt(sessionId, { question, correct, hint });

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ score: session.score, total: session.total });
}
