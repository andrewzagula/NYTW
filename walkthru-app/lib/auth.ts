import Database from "@replit/database";
import fs from "fs";
import path from "path";

// --- Replit DB singleton (only used when REPLIT_DB_URL is set) ---

let _db: Database | null = null;

function getDb(): Database {
  if (!_db) _db = new Database();
  return _db;
}

// --- File-based token store for local dev ---

const DEV_TOKEN_FILE = path.join(process.cwd(), ".dev-tokens.json");

function readDevTokens(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(DEV_TOKEN_FILE, "utf-8")) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeDevTokens(tokens: Record<string, string>): void {
  fs.writeFileSync(DEV_TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

// --- Cookie helper (for dev login fallback) ---

function parseCookies(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of cookieHeader.split(";")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    result[pair.slice(0, eq).trim()] = decodeURIComponent(pair.slice(eq + 1).trim());
  }
  return result;
}

// --- Public API ---

export function getSessionUser(
  req: Request
): { id: string; name: string } | null {
  // Production: Replit injects these headers
  const id = req.headers.get("x-replit-user-id");
  const name = req.headers.get("x-replit-user-name");
  if (id && name) return { id, name };

  // Local dev fallback: read from cookie set by /dev-login
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
  if (process.env.REPLIT_DB_URL) {
    const token = await getDb().get(`gh_token:${userId}`);
    return typeof token === "string" ? token : null;
  }
  return readDevTokens()[userId] ?? null;
}

export async function storeGithubToken(
  userId: string,
  token: string
): Promise<void> {
  if (process.env.REPLIT_DB_URL) {
    await getDb().set(`gh_token:${userId}`, token);
    return;
  }
  const tokens = readDevTokens();
  tokens[userId] = token;
  writeDevTokens(tokens);
}
