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

export async function newCommit(commitDescriptionParts: string[], options: NewCommitOptions): Promise<void> {
  const commitDescription = commitDescriptionParts.join(" ").trim();
  const token = await getToken();

  if (!commitDescription) {
    console.error("error: missing required argument 'commit-description'");
    process.exit(1);
  }

  const data = await apiPost<NewCommitResponse>("/new-commit", token, {
    commitDescription,
    commitMessage: options.message,
    commitId: options.commitId,
  });

  if (data?.url) {
    console.log(`Walkthru available @ ${data.url}`);
    return;
  }

  console.error(chalk.dim("Walkthru unavailable; commit may proceed."));
}
