import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/server";
import { connectRepo } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { owner?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { owner, name } = body;
  if (!owner || !name) {
    return NextResponse.json({ error: "Missing owner or name" }, { status: 400 });
  }

  await connectRepo(user.id, owner, name);
  return NextResponse.json({ success: true });
}
