import { readFileSync, existsSync } from "fs";
import { join } from "path";
import simpleGit from "simple-git";
import { input } from "@inquirer/prompts";
import chalk from "chalk";
import { getToken } from "../lib/config.js";

interface WalkthruConfig {
  threshold: number;
  allowOverride: boolean;
  overrideRequiresNote: boolean;
  questionTypes: string[];
  exemptPaths: string[];
  minDiffLines: number;
}

interface QuestionResponse {
  question: string;
  questionId: string;
}

interface GradeResponse {
  score: number;
  feedback: string;
}

const WALKTHRU_API = "https://walkthru.dev/api";

function loadConfig(): WalkthruConfig {
  const configPath = join(process.cwd(), ".walkthru.json");
  if (!existsSync(configPath)) {
    return {
      threshold: 70,
      allowOverride: true,
      overrideRequiresNote: true,
      questionTypes: ["explain", "impact", "risk"],
      exemptPaths: ["*.md", "*.lock", "generated/**"],
      minDiffLines: 10,
    };
  }
  return JSON.parse(readFileSync(configPath, "utf-8"));
}

function isExempt(file: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const re = new RegExp(
      "^" + pattern.replace(/\./g, "\\.").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$"
    );
    return re.test(file);
  });
}

async function apiPost<T>(path: string, token: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${WALKTHRU_API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export async function runCommitGate(msgFile: string) {
  const config = loadConfig();
  const token = await getToken();

  if (!token) {
    console.error(chalk.red("\n  Run `walkthru login` first.\n"));
    process.exit(1);
  }

  const git = simpleGit();
  const diff = await git.diff(["--cached"]);
  const changedFiles = (await git.diff(["--cached", "--name-only"])).trim().split("\n").filter(Boolean);
  const commitMessage = readFileSync(msgFile, "utf-8").trim();

  const diffLines = diff.split("\n").filter((l) => l.startsWith("+") || l.startsWith("-")).length;
  const allExempt = changedFiles.every((f) => isExempt(f, config.exemptPaths));

  if (allExempt || diffLines < config.minDiffLines) {
    process.exit(0);
  }

  console.log(chalk.bold("\n  Walkthru — comprehension gate\n"));
  console.log(chalk.dim(`  Staged: ${diffLines} lines across ${changedFiles.length} file(s)\n`));

  const questionData = await apiPost<QuestionResponse>("/question", token, {
    diff,
    commitMessage,
    questionTypes: config.questionTypes,
  });

  if (!questionData) {
    console.log(chalk.dim("  Could not reach Walkthru API. Commit proceeding.\n"));
    process.exit(0);
  }

  const { question, questionId } = questionData;
  console.log(chalk.bold("  Q:"), question, "\n");

  const answer = await input({ message: "A:" });
  console.log();

  const gradeData = await apiPost<GradeResponse>("/grade", token, {
    questionId,
    answer,
    diff,
  });

  if (!gradeData) {
    console.log(chalk.dim("  Could not grade. Commit proceeding.\n"));
    process.exit(0);
  }

  const { score, feedback } = gradeData;
  const scoreColor = score >= config.threshold ? chalk.green : chalk.red;

  console.log(`  Score: ${scoreColor(`${score}/100`)}\n`);
  console.log(chalk.dim(`  "${feedback}"\n`));

  if (score >= config.threshold) {
    console.log(chalk.green("  Commit proceeding...\n"));
    process.exit(0);
  }

  if (config.allowOverride) {
    const skip = await input({ message: "Score below threshold. Override? (y/N):" });
    if (skip.toLowerCase() === "y") {
      if (config.overrideRequiresNote) {
        await input({ message: "Reason for override:" });
      }
      process.exit(0);
    }
  }

  console.log(chalk.red("\n  Commit blocked. Try again.\n"));
  process.exit(1);
}
