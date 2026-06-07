import { password } from "@inquirer/prompts";
import chalk from "chalk";
import { saveToken } from "../lib/config.js";

export async function login() {
  console.log(chalk.bold("\n  Walkthru — GitHub authentication\n"));
  const token = await password({ message: "GitHub personal access token:" });
  await saveToken(token);
  console.log(chalk.green("\n  Saved. Run `walkthru init` inside a repo to install the hook.\n"));
}
