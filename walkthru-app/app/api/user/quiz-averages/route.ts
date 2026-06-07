import { getSessionUser } from "@/lib/auth/server";
import { getUserRepoAverages } from "@/lib/db";

export const maxDuration = 10;

export async function GET(req: Request) {
  const user = getSessionUser(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const averages = await getUserRepoAverages(user.id);
  return Response.json({ averages });
}
