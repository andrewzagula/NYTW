import { execFileSync } from "child_process";
import { existsSync, writeFileSync } from "fs";
import chalk from "chalk";

const POST_COMMIT_HOOK = `#!/bin/sh
walkthru hook post-commit || true
`;

const PRE_PUSH_HOOK = `#!/bin/sh
walkthru hook pre-push "$@" || true
`;

const DEFAULT_CONFIG = {
  includeDiff: true,
  maxDiffBytes: 120000,
};

function gitPath(path: string): string {
  return execFileSync("git", ["rev-parse", "--git-path", path], { encoding: "utf-8" }).trim();
}

function ensureGitRepo(): void {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { stdio: "ignore" });
  } catch {
    console.error(chalk.red("\n  Not a git repository.\n"));
    process.exit(1);
  }
}

function installHook(name: string, script: string): void {
  const hookPath = gitPath(`hooks/${name}`);
  writeFileSync(hookPath, script, { mode: 0o755 });
  console.log(chalk.dim(`  Installed ${hookPath}`));
}

export async function init() {
  ensureGitRepo();

  installHook("post-commit", POST_COMMIT_HOOK);
  installHook("pre-push", PRE_PUSH_HOOK);

  const configPath = ".walkthru.json";
  if (!existsSync(configPath)) {
    writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log(chalk.dim("  Created .walkthru.json"));
  }

  console.log(chalk.green("\n  Hooks installed. Walkthru will register commits after commit and before push.\n"));
}
