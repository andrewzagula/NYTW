import { existsSync, readFileSync } from "fs";
import { join } from "path";
import chalk from "chalk";

const DEFAULT_APP_URL = "https://walkthru.dev";

function fromConfig(key: "appUrl" | "apiUrl"): string | undefined {
  try {
    const path = join(process.cwd(), ".walkthru.json");
    if (!existsSync(path)) return undefined;
    const config = JSON.parse(readFileSync(path, "utf-8"));
    return typeof config[key] === "string" ? config[key] : undefined;
  } catch {
    return undefined;
  }
}

/** Base URL of the Walkthru web app (used for the login OAuth flow). */
export function appUrl(): string {
  return process.env.WALKTHRU_APP_URL ?? fromConfig("appUrl") ?? DEFAULT_APP_URL;
}

/**
 * Base URL of the Walkthru API. Resolution order: `WALKTHRU_API` env var, then
 * `apiUrl` in `.walkthru.json`, then `<appUrl>/api`. For a local demo point it
 * at the dev server, e.g. `WALKTHRU_API=http://localhost:3000/api`.
 */
export function apiUrl(): string {
  return process.env.WALKTHRU_API ?? fromConfig("apiUrl") ?? `${appUrl()}/api`;
}

export async function apiPost<T>(path: string, token: string | undefined, body: unknown): Promise<T | null> {
  const url = `${apiUrl()}${path}`;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).trim();
      const hint = res.status === 401 ? " (run `walkthru login`)" : "";
      console.error(
        chalk.yellow(`Walkthru: ${res.status} from ${url}${hint}${detail ? ` — ${detail.slice(0, 200)}` : ""}`)
      );
      return null;
    }

    return res.json() as Promise<T>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.yellow(`Walkthru: could not reach ${url} — ${message}`));
    return null;
  }
}
