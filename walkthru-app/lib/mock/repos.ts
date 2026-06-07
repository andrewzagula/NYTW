/** Mocked repositories for the dashboard. Replaced by real GitHub data later. */

export type MockRepo = {
  id: string;
  owner: string;
  name: string;
  description: string;
  defaultBranch: string;
  branchCount: number;
  openPrs: number;
  language: string;
  /** ISO timestamp of last activity. */
  lastActivity: string;
  /** Rolling team comprehension score, 0–100. */
  teamScore: number;
};

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();
const hoursAgo = (n: number) => new Date(Date.now() - n * HOUR).toISOString();

export const repos: MockRepo[] = [
  {
    id: "checkout-service",
    owner: "northwind",
    name: "checkout-service",
    description: "Payments + cart orchestration for the storefront.",
    defaultBranch: "main",
    branchCount: 7,
    openPrs: 3,
    language: "TypeScript",
    lastActivity: hoursAgo(5),
    teamScore: 82,
  },
  {
    id: "ledger-core",
    owner: "northwind",
    name: "ledger-core",
    description: "Double-entry ledger and reconciliation engine.",
    defaultBranch: "main",
    branchCount: 12,
    openPrs: 5,
    language: "Rust",
    lastActivity: daysAgo(1),
    teamScore: 67,
  },
  {
    id: "web-dashboard",
    owner: "northwind",
    name: "web-dashboard",
    description: "Customer-facing analytics dashboard (Next.js).",
    defaultBranch: "main",
    branchCount: 4,
    openPrs: 2,
    language: "TypeScript",
    lastActivity: daysAgo(2),
    teamScore: 91,
  },
  {
    id: "ml-pipeline",
    owner: "northwind",
    name: "ml-pipeline",
    description: "Feature store and training pipelines.",
    defaultBranch: "main",
    branchCount: 9,
    openPrs: 1,
    language: "Python",
    lastActivity: daysAgo(4),
    teamScore: 44,
  },
  {
    id: "infra",
    owner: "northwind",
    name: "infra",
    description: "Terraform, Helm charts, and CI configuration.",
    defaultBranch: "main",
    branchCount: 6,
    openPrs: 0,
    language: "HCL",
    lastActivity: daysAgo(6),
    teamScore: 73,
  },
  {
    id: "mobile-app",
    owner: "northwind",
    name: "mobile-app",
    description: "React Native client for iOS and Android.",
    defaultBranch: "main",
    branchCount: 8,
    openPrs: 4,
    language: "TypeScript",
    lastActivity: daysAgo(3),
    teamScore: 58,
  },
];

export function getRepo(id: string): MockRepo | undefined {
  return repos.find((r) => r.id === id);
}
