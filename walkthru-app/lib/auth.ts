import Database from "@replit/database";

let _db: Database | null = null;

function getDb(): Database {
  if (!_db) _db = new Database();
  return _db;
}

export function getSessionUser(
  req: Request
): { id: string; name: string } | null {
  const id = req.headers.get("x-replit-user-id");
  const name = req.headers.get("x-replit-user-name");
  if (!id || !name) return null;
  return { id, name };
}

export async function getGithubToken(userId: string): Promise<string | null> {
  const db = getDb();
  const token = await db.get(`gh_token:${userId}`);
  return typeof token === "string" ? token : null;
}

export async function storeGithubToken(
  userId: string,
  token: string
): Promise<void> {
  const db = getDb();
  await db.set(`gh_token:${userId}`, token);
}
