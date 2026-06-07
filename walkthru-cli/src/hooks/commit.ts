import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import chalk from "chalk";
import simpleGit, { SimpleGit } from "simple-git";
import { registerNewCommit } from "../commands/new-commit.js";
import { getRepoContext } from "../lib/git.js";

interface WalkthruConfig {
  includeDiff?: boolean;
  maxDiffBytes?: number;
}

interface CommitDetails {
  sha: string;
  subject: string;
  body: string;
  message: string;
  description: string;
  diff?: string;
  branch?: string;
  remoteUrl?: string;
  repository?: string;
}

const DEFAULT_CONFIG: Required<WalkthruConfig> = {
  includeDiff: true,
  maxDiffBytes: 120_000,
};

const ZERO_SHA = /^0+$/;

function loadConfig(): Required<WalkthruConfig> {
  const configPath = join(process.cwd(), ".walkthru.json");
  if (!existsSync(configPath)) return DEFAULT_CONFIG;

  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(configPath, "utf-8")) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function truncate(value: string, maxBytes: number): string {
  const bytes = Buffer.byteLength(value);
  if (bytes <= maxBytes) return value;

  let output = value;
  while (Buffer.byteLength(output) > maxBytes) {
    output = output.slice(0, Math.floor(output.length * 0.9));
  }
  return `${output}\n\n[Walkthru truncated diff from ${bytes} bytes to ${maxBytes} bytes]`;
}

async function registeredPath(git: SimpleGit): Promise<string> {
  const path = await git.raw(["rev-parse", "--git-path", "walkthru/registered-commits.json"]);
  return path.trim();
}

async function readRegistered(git: SimpleGit): Promise<Set<string>> {
  const path = await registeredPath(git);
  if (!existsSync(path)) return new Set();

  try {
    const values = JSON.parse(readFileSync(path, "utf-8"));
    return new Set(Array.isArray(values) ? values : []);
  } catch {
    return new Set();
  }
}

async function markRegistered(git: SimpleGit, sha: string): Promise<void> {
  const path = await registeredPath(git);
  const registered = await readRegistered(git);
  registered.add(sha);

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify([...registered].sort(), null, 2));
}

async function getCommitDetails(git: SimpleGit, sha: string): Promise<CommitDetails> {
  const config = loadConfig();
  const rawMessage = await git.raw(["show", "--quiet", "--format=%s%n%n%b", sha]);
  const message = rawMessage.trim();
  const [subject = "", ...bodyParts] = message.split(/\n\n/);
  const body = bodyParts.join("\n\n").trim();
  const { branch, remoteUrl, repository } = await getRepoContext(git);
  const diff = config.includeDiff
    ? truncate(await git.raw(["show", "--format=", "--no-ext-diff", sha]), config.maxDiffBytes)
    : undefined;

  return {
    sha,
    subject,
    body,
    message,
    description: body || subject || `Commit ${sha}`,
    diff,
    branch,
    remoteUrl,
    repository,
  };
}

async function registerCommit(git: SimpleGit, sha: string, source: "post-commit" | "pre-push"): Promise<void> {
  const registered = await readRegistered(git);
  if (registered.has(sha)) return;

  const details = await getCommitDetails(git, sha);
  const data = await registerNewCommit({
    commitDescription: details.description,
    commitMessage: details.subject,
    commitId: sha,
    commitSha: sha,
    repository: details.repository,
    branch: details.branch,
    remoteUrl: details.remoteUrl,
    diff: details.diff,
    source,
  });

  if (!data?.url) {
    console.log(chalk.dim(`Walkthru unavailable for ${sha.slice(0, 7)}; Git will continue.`));
    return;
  }

  await markRegistered(git, sha);
  console.log(chalk.green(`Walkthru quiz for ${sha.slice(0, 7)}: ${data.url}`));
  if (data.commitUrl) {
    console.log(chalk.green(`Commit for ${sha.slice(0, 7)}: ${data.commitUrl}`));
  }
}

export async function runPostCommitHook(): Promise<void> {
  const git = simpleGit();
  const sha = (await git.revparse(["HEAD"])).trim();
  await registerCommit(git, sha, "post-commit");
}

export async function runPrePushHook(): Promise<void> {
  const git = simpleGit();
  const input = await new Promise<string>((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
  });

  for (const line of input.split("\n").map((value) => value.trim()).filter(Boolean)) {
    const [, localSha, , remoteSha] = line.split(/\s+/);
    if (!localSha || ZERO_SHA.test(localSha)) continue;

    const revListArgs = remoteSha && !ZERO_SHA.test(remoteSha)
      ? ["rev-list", "--reverse", `${remoteSha}..${localSha}`]
      : ["rev-list", "--reverse", "--max-count=1", localSha];

    const commits = (await git.raw(revListArgs)).trim().split("\n").filter(Boolean);
    for (const sha of commits) {
      await registerCommit(git, sha, "pre-push");
    }
  }
}
