import { spawn } from "child_process";
import { existsSync } from "fs";
import { dirname, resolve } from "path";
import chalk from "chalk";
import { select } from "@inquirer/prompts";
import simpleGit from "simple-git";
import { appUrl } from "../lib/api.js";

interface CommitChoice {
  name: string;
  value: string;
  description?: string;
}

const QUIT = "__quit__";
const OPEN_WALKTHRU = "__open_walkthru__";
const COMMITS = "__commits__";

function findGitRoot(startDir: string): string | null {
  let current = resolve(startDir);

  while (true) {
    if (existsSync(resolve(current, ".git"))) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

function parseCommitChoices(graph: string): CommitChoice[] {
  const choices: CommitChoice[] = [];

  for (const line of graph.split("\n")) {
    const trimmed = line.trimEnd();
    if (!trimmed) continue;

    const match = trimmed.match(/\b[0-9a-f]{7,40}\b/i);
    if (!match) continue;

    choices.push({
      name: trimmed,
      value: match[0],
      description: "Open commit details",
    });
  }

  return choices;
}

async function openCommits(repoRoot: string): Promise<void> {
  const git = simpleGit(repoRoot);
  const graph = await git.raw([
    "log",
    "--branches",
    "--remotes",
    "--tags",
    "--graph",
    "--decorate",
    "--oneline",
    "--date=short",
  ]);
  const commits = parseCommitChoices(graph);

  if (commits.length === 0) {
    console.log(chalk.dim("\n  No commits found in this repository.\n"));
    return;
  }

  const selected = await select({
    message: "Open commits..",
    pageSize: 20,
    choices: [
      ...commits,
      { name: "Back", value: QUIT },
    ],
  });

  if (selected === QUIT) return;

  const details = await git.raw([
    "show",
    "--stat",
    "--decorate",
    "--date=short",
    "--format=fuller",
    "--no-ext-diff",
    selected,
  ]);

  console.log();
  console.log(details.trimEnd());
  console.log();
}

function openLoginFlow(): void {
  const loginUrl = `${appUrl()}/signin`;
  const command =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", loginUrl] : [loginUrl];

  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  console.log(chalk.dim(`\n  Opening ${loginUrl}\n`));
}

export async function openWalkthru(): Promise<void> {
  const repoRoot = findGitRoot(process.cwd());

  if (!repoRoot) {
    console.error(chalk.red("\n  Not a git repository. Run `git init` first.\n"));
    process.exit(1);
  }

  console.log(chalk.bold("\n  walkthru CLI"));
  console.log(chalk.dim(`  ${repoRoot}\n`));

  while (true) {
    const action = await select({
      message: "Select an option",
      choices: [
        { name: "Open walkthru", value: OPEN_WALKTHRU, description: "Open the login flow" },
        { name: "Open commits..", value: COMMITS, description: "Browse the local git graph" },
        { name: "Quit", value: QUIT },
      ],
    });

    if (action === QUIT) return;
    if (action === OPEN_WALKTHRU) {
      openLoginFlow();
    }
    if (action === COMMITS) {
      await openCommits(repoRoot);
    }
  }
}
