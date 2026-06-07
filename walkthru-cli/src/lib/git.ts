import simpleGit, { SimpleGit } from "simple-git";

export interface RepoContext {
  branch?: string;
  remoteUrl?: string;
  repository?: string;
}

export async function optionalGit(git: SimpleGit, args: string[]): Promise<string | undefined> {
  try {
    const value = (await git.raw(args)).trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

export async function getRepoContext(git: SimpleGit = simpleGit()): Promise<RepoContext> {
  const branch = await optionalGit(git, ["branch", "--show-current"]);
  const remoteUrl = await optionalGit(git, ["config", "--get", "remote.origin.url"]);
  const topLevel = await optionalGit(git, ["rev-parse", "--show-toplevel"]);
  const repository = topLevel ? topLevel.split("/").filter(Boolean).pop() : undefined;
  return { branch, remoteUrl, repository };
}
