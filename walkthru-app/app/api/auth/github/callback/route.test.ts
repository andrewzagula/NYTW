import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// DB writes are mocked — we only care that the handler persists identity + token.
// vi.hoisted so the fns exist before the hoisted vi.mock factories run.
const { upsertUser, storeGithubToken } = vi.hoisted(() => ({
  upsertUser: vi.fn(async () => {}),
  storeGithubToken: vi.fn(async () => {}),
}));

vi.mock("@/lib/db", () => ({ upsertUser }));

// Keep OAUTH_STATE_COOKIE + setSessionCookies real (pure), mock the DB-backed bits.
vi.mock("@/lib/auth/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/server")>();
  return { ...actual, storeGithubToken };
});

import { GET } from "./route";
import { OAUTH_STATE_COOKIE } from "@/lib/auth/server";

function mockGithub() {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      // 1. token exchange
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "gho_test_token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      // 2. GET /user
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 12345, login: "octocat", avatar_url: "https://x/a.png" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
  );
}

function callbackRequest(query: string, cookie?: string) {
  return new NextRequest(
    `http://localhost:3000/api/auth/github/callback${query}`,
    cookie ? { headers: { cookie } } : undefined
  );
}

describe("GET /api/auth/github/callback", () => {
  beforeEach(() => {
    upsertUser.mockClear();
    storeGithubToken.mockClear();
    vi.stubEnv("GITHUB_CLIENT_ID", "client-id");
    vi.stubEnv("GITHUB_CLIENT_SECRET", "client-secret");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("establishes a session from the GitHub identity (no prior login required)", async () => {
    mockGithub();
    const res = await GET(
      callbackRequest("?code=abc&state=xyz", `${OAUTH_STATE_COOKIE}=xyz`)
    );

    // Redirects into the app — NOT a 401 "Not authenticated".
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard");

    // Identity is derived from GitHub and persisted under a stable id.
    expect(upsertUser).toHaveBeenCalledWith("gh_12345", {
      github_username: "octocat",
      github_avatar: "https://x/a.png",
    });
    expect(storeGithubToken).toHaveBeenCalledWith("gh_12345", "gho_test_token");

    // A session cookie is minted so subsequent requests are authenticated.
    expect(res.cookies.get("__dev_user_id")?.value).toBe("gh_12345");
  });

  it("rejects a callback whose state does not match the cookie (CSRF guard)", async () => {
    mockGithub();
    const res = await GET(
      callbackRequest("?code=abc&state=attacker", `${OAUTH_STATE_COOKIE}=xyz`)
    );
    expect(res.status).toBe(400);
    expect(storeGithubToken).not.toHaveBeenCalled();
  });
});
