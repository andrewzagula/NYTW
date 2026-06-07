import chalk from "chalk";
import { apiPost } from "../lib/api.js";
import { getToken } from "../lib/config.js";

interface NewCommitOptions {
  message?: string;
  commitId?: string;
}

interface NewCommitResponse {
  url?: string;
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

  const data = await registerNewCommit({
    commitDescription,
    commitMessage: options.message,
    commitId: options.commitId,
    source: "manual",
  });

  if (data?.url) {
    console.log(`Walkthru available @ ${data.url}`);
    return;
  }

  console.error(chalk.dim("Walkthru unavailable; commit may proceed."));
}
