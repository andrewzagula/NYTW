import chalk from "chalk";
import { apiPost } from "../lib/api.js";
import { getToken } from "../lib/config.js";
import { getRepoContext } from "../lib/git.js";

interface NewCommitOptions {
  message?: string;
  commitId?: string;
}

interface NewCommitResponse {
  url?: string;
  commitUrl?: string;
}

export interface NewCommitPayload {
  commitDescription: string;
  commitMessage?: string;
  commitId?: string;
  commitSha?: string;
  repository?: string;
  branch?: string;
  remoteUrl?: string;
  diff?: string;
  source?: "manual" | "post-commit" | "pre-push";
}

export async function registerNewCommit(payload: NewCommitPayload): Promise<NewCommitResponse | null> {
  const token = await getToken();
  return apiPost<NewCommitResponse>("/new-commit", token, payload);
}

export async function newCommit(commitDescriptionParts: string[], options: NewCommitOptions): Promise<void> {
  const commitDescription = commitDescriptionParts.join(" ").trim();

  if (!commitDescription) {
    console.error("error: missing required argument 'commit-description'");
    process.exit(1);
  }

  const { branch, remoteUrl, repository } = await getRepoContext();

  // A commit URL (/repos/{owner}/{name}?commit={sha}) is only meaningful for a
  // real commit SHA. The manual command registers an upcoming commit, so we only
  // forward a SHA when the caller provides one that looks like a git object id.
  const commitSha = options.commitId && /^[0-9a-f]{7,40}$/i.test(options.commitId)
    ? options.commitId
    : undefined;

  const data = await registerNewCommit({
    commitDescription,
    commitMessage: options.message,
    commitId: options.commitId,
    commitSha,
    repository,
    branch,
    remoteUrl,
    source: "manual",
  });

  if (data?.url) {
    console.log(`Walkthru available @ ${data.url}`);
    if (data.commitUrl) {
      console.log(`Commit @ ${data.commitUrl}`);
    }
    return;
  }

  console.error(chalk.dim("Walkthru unavailable; commit may proceed."));
}
