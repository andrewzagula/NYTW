import { getPool, initDb } from "@/lib/postgres";

// --- Cookie helper ---

function parseCookies(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of cookieHeader.split(";")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    result[pair.slice(0, eq).trim()] = decodeURIComponent(pair.slice(eq + 1).trim());
  }
  return result;
}

let _initialized = false;
async function db() {
  if (!_initialized) {
    await initDb();
    _initialized = true;
  }
  return getPool();
}

// --- Public API ---

export function getSessionUser(
  req: Request
): { id: string; name: string } | null {
  const id = req.headers.get("x-replit-user-id");
  const name = req.headers.get("x-replit-user-name");
  if (id && name) return { id, name };

  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const devId = cookies["__dev_user_id"];
    const devName = cookies["__dev_user_name"];
    if (devId && devName) return { id: devId, name: devName };
  }

  return null;
}

export async function getGithubToken(userId: string): Promise<string | null> {
  const pool = await db();
  const { rows } = await pool.query(
    `SELECT token FROM github_tokens WHERE user_id = $1`,
    [userId]
  );
  return rows[0]?.token ?? null;
}

export async function storeGithubToken(userId: string, token: string): Promise<void> {
  const pool = await db();
  await pool.query(
    `INSERT INTO github_tokens (user_id, token)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token`,
    [userId, token]
  );
}

export async function deleteGithubToken(userId: string): Promise<void> {
  const pool = await db();
  await pool.query(`DELETE FROM github_tokens WHERE user_id = $1`, [userId]);
}
