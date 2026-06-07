import chalk from "chalk";
import { appUrl } from "../lib/api.js";
import { openBrowser } from "../lib/browser.js";

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
