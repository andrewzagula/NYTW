import { createServer } from "http";
import { spawn } from "child_process";
import chalk from "chalk";
import { saveToken } from "../lib/config.js";
import { appUrl } from "../lib/api.js";

// Fixed loopback port so the flow is predictable; matches the standard
// CLI OAuth pattern used by tools like `gh`. The web OAuth callback hands the
// GitHub access token back here once the browser sign-in completes.
const CALLBACK_PORT = 53682;
const TIMEOUT_MS = 120_000;

const RESULT_PAGE = (ok: boolean) => `<!doctype html>
<html><head><meta charset="utf-8"><title>Walkthru</title>
<style>body{font-family:system-ui,sans-serif;background:#0d0d0f;color:#fafafa;display:flex;height:100vh;margin:0;align-items:center;justify-content:center}
.card{text-align:center}.t{font-size:1.4rem;font-weight:600}.s{color:#a1a1aa;margin-top:.5rem}</style></head>
<body><div class="card"><div class="t">${ok ? "Signed in to Walkthru" : "Walkthru sign-in failed"}</div>
<div class="s">${ok ? "You can close this tab and return to your terminal." : "Return to your terminal and try again."}</div></div></body></html>`;

function openBrowser(url: string): void {
  const command =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.unref();
}

export async function login(): Promise<void> {
  const authUrl = `${appUrl()}/api/auth/github?cli_port=${CALLBACK_PORT}`;

  console.log(chalk.bold("\n  Walkthru — GitHub authentication\n"));

  const result = await new Promise<{ token: string; login?: string }>((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://127.0.0.1:${CALLBACK_PORT}`);
      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end();
        return;
      }

      const token = url.searchParams.get("token");
      const ghLogin = url.searchParams.get("login") ?? undefined;

      res.writeHead(token ? 200 : 400, { "Content-Type": "text/html" });
      res.end(RESULT_PAGE(Boolean(token)));
      server.close();

      if (token) {
        resolve({ token, login: ghLogin });
      } else {
        reject(new Error("No token returned from Walkthru"));
      }
    });

    server.on("error", (error) => {
      reject(
        (error as NodeJS.ErrnoException).code === "EADDRINUSE"
          ? new Error(`Port ${CALLBACK_PORT} is in use; close the other process and retry.`)
          : error
      );
    });

    server.listen(CALLBACK_PORT, "127.0.0.1", () => {
      console.log(chalk.dim(`  Opening ${authUrl}`));
      console.log(chalk.dim("  Waiting for the browser to complete sign-in...\n"));
      openBrowser(authUrl);
    });

    setTimeout(() => {
      server.close();
      reject(new Error("Timed out waiting for sign-in"));
    }, TIMEOUT_MS).unref();
  });

  await saveToken(result.token);
  console.log(
    chalk.green(
      `\n  Signed in${result.login ? ` as ${result.login}` : ""}. Run \`walkthru init\` inside a repo to install the hooks.\n`
    )
  );
}
