import { existsSync } from "fs";
import { appendFile, mkdir } from "fs/promises";
import { dirname, resolve } from "path";
import chalk from "chalk";
import simpleGit from "simple-git";

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

export async function newCommit(): Promise<void> {
  const repoRoot = findGitRoot(process.cwd());

  if (!repoRoot) {
    console.error(chalk.red("\n  Not a git repository. Run this from inside the repo you are updating.\n"));
    process.exit(1);
  }

  const git = simpleGit(repoRoot);
  const [sha, summary, branch] = await Promise.all([
    git.revparse(["HEAD"]),
    git.raw([
      "show",
      "--stat",
      "--decorate",
      "--date=short",
      "--format=fuller",
      "--no-ext-diff",
      "HEAD",
    ]),
    git.revparse(["--abbrev-ref", "HEAD"]),
  ]);
  const trimmedSha = sha.trim();
  const walkthruDir = resolve(repoRoot, ".walkthru");
  const recordPath = resolve(walkthruDir, "commits.jsonl");
  const record = {
    sha: trimmedSha,
    branch: branch.trim(),
    recordedAt: new Date().toISOString(),
  };

  await mkdir(walkthruDir, { recursive: true });
  await appendFile(recordPath, `${JSON.stringify(record)}\n`);

  console.log(chalk.bold("\n  Walkthru — new commit\n"));
  console.log(chalk.dim(`  Repo: ${repoRoot}`));
  console.log(chalk.dim(`  Commit: ${trimmedSha}`));
  console.log(chalk.dim(`  Record: ${recordPath}\n`));
  console.log(summary.trimEnd());
  console.log(chalk.green("\n  Recorded latest commit locally. Run this after every PR update or push.\n"));
}
