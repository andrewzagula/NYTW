import { existsSync, writeFileSync } from "fs";
import { join } from "path";
import chalk from "chalk";

const HOOK_SCRIPT = `#!/bin/sh
walkthru hook commit-msg "$1"
`;

const DEFAULT_CONFIG = {
  threshold: 70,
  allowOverride: true,
  overrideRequiresNote: true,
  questionTypes: ["explain", "impact", "risk"],
  exemptPaths: ["*.md", "*.lock", "generated/**"],
  minDiffLines: 10,
};

export async function init() {
  const gitDir = join(process.cwd(), ".git");

  if (!existsSync(gitDir)) {
    console.error(chalk.red("\n  Not a git repository.\n"));
    process.exit(1);
  }

  const hookPath = join(gitDir, "hooks", "commit-msg");
  writeFileSync(hookPath, HOOK_SCRIPT, { mode: 0o755 });
  console.log(chalk.dim("  Installed .git/hooks/commit-msg"));

  const configPath = join(process.cwd(), ".walkthru.json");
  if (!existsSync(configPath)) {
    writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log(chalk.dim("  Created .walkthru.json"));
  }

  console.log(chalk.green("\n  Hook installed. Walkthru will run on every commit.\n"));
}
