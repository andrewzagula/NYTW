import { existsSync, readFileSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import { getToken } from "./config.js";

const DEFAULT_APP_URL = "https://nytw.vercel.app";

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
  // `retried` guards against an infinite login→retry→401 loop when sign-in
  // still doesn't yield a token the server accepts.
  const attempt = async (authToken: string | undefined, retried: boolean): Promise<T | null> => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const detail = (await res.text().catch(() => "")).trim();

        // On an auth failure, kick off the interactive login flow and retry once
        // with the freshly saved token instead of just bailing out.
        if (res.status === 401 && !retried && process.stdout.isTTY) {
          console.error(chalk.yellow("Walkthru: not signed in — launching `walkthru login`..."));
          const { login } = await import("../commands/login.js");
          try {
            await login();
          } catch (loginError) {
            const message = loginError instanceof Error ? loginError.message : String(loginError);
            console.error(chalk.yellow(`Walkthru: sign-in failed — ${message}`));
            return null;
          }
          return attempt(await getToken(), true);
        }

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
  };

  return attempt(token, false);
}
