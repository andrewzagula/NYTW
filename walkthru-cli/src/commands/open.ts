import { spawn } from "child_process";
import chalk from "chalk";
import { appUrl } from "../lib/api.js";

function openBrowser(url: string): void {
  const command =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];

  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.unref();
}

/**
 * Open the Walkthru web app. The CLI's job is to register commits via the git
 * hooks; the quiz itself lives in the web app, so "open" simply continues the
 * flow there. The dashboard is the landing point — it gates on sign-in and
 * lists the comprehension sessions created by `POST /new-commit`.
 */
export async function openWalkthru(): Promise<void> {
  const url = `${appUrl()}/dashboard`;
  openBrowser(url);
  console.log(chalk.dim(`\n  Opening ${url}\n`));
}
