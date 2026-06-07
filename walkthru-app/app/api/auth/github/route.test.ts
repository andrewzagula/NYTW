import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { OAUTH_STATE_COOKIE } from "@/lib/auth/server";
import { GET } from "./route";

function authRequest(url = "https://walkthru.example.com/api/auth/github") {
  return new NextRequest(url);
}

describe("GET /api/auth/github", () => {
  beforeEach(() => {
    vi.stubEnv("GITHUB_CLIENT_ID", "client-id");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends GitHub a callback URL on the request origin", async () => {
    const res = await GET(authRequest());

    expect(res.status).toBe(307);

    const location = res.headers.get("location");
    expect(location).toBeTruthy();

    const authorizeUrl = new URL(location!);
    expect(authorizeUrl.origin).toBe("https://github.com");
    expect(authorizeUrl.pathname).toBe("/login/oauth/authorize");
    expect(authorizeUrl.searchParams.get("client_id")).toBe("client-id");
    expect(authorizeUrl.searchParams.get("scope")).toBe("repo,read:user");
    expect(authorizeUrl.searchParams.get("redirect_uri")).toBe(
      "https://walkthru.example.com/api/auth/github/callback"
    );

    const state = authorizeUrl.searchParams.get("state");
    expect(state).toBeTruthy();
    expect(res.cookies.get(OAUTH_STATE_COOKIE)?.value).toBe(state);
  });

  it("does not require NEXT_PUBLIC_APP_URL to start OAuth", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    const res = await GET(authRequest("https://prod.example.com/api/auth/github"));
    const location = res.headers.get("location");

    expect(res.status).toBe(307);
    expect(new URL(location!).searchParams.get("redirect_uri")).toBe(
      "https://prod.example.com/api/auth/github/callback"
    );
  });
});
