import { getSessionUser } from "@/lib/auth/server";
import { supersedeQuizSessions } from "@/lib/db";

export const maxDuration = 10;

type Body = { owner?: string; name?: string; commitSha?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { owner, name, commitSha } = body;
  if (!owner || !name || !commitSha) {
    return Response.json({ error: "owner, name, commitSha required" }, { status: 400 });
  }
  const user = getSessionUser(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await supersedeQuizSessions(user.id, `${owner}/${name}`, commitSha);
  return Response.json({ ok: true });
}
