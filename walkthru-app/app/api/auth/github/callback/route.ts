import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  OAUTH_STATE_COOKIE,
  setSessionCookies,
  storeGithubToken,
} from "@/lib/auth/server";
import { upsertUser } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  // CSRF: the state we handed GitHub must come back unchanged and match the
  // cookie we set when starting the flow.
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Missing GitHub OAuth credentials" },
      { status: 500 }
    );
  }

  // 1. Exchange the authorization code for an access token.
  let tokenData: { access_token?: string; error_description?: string };
  try {
    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
      }
    );

    if (!tokenRes.ok) {
      return NextResponse.json(
        { error: "Token exchange request failed" },
        { status: 500 }
      );
    }

    tokenData = await tokenRes.json();
  } catch {
    return NextResponse.json({ error: "Token exchange failed" }, { status: 500 });
  }

  if (!tokenData.access_token) {
    return NextResponse.json(
      { error: tokenData.error_description ?? "No access token in response" },
      { status: 500 }
    );
  }

  // 2. Identify the user from GitHub. This is what establishes the session, so
  //    unlike a "connect" step it is required — we can't log someone in without
  //    knowing who they are.
  let ghUser: { id: number; login: string; avatar_url: string };
  try {
    const ghUserRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!ghUserRes.ok) {
      return NextResponse.json(
        { error: "Failed to load GitHub profile" },
        { status: 502 }
      );
    }
    ghUser = (await ghUserRes.json()) as typeof ghUser;
  } catch {
    return NextResponse.json(
      { error: "Failed to load GitHub profile" },
      { status: 502 }
    );
  }

  // Stable internal id derived from the GitHub numeric id (survives renames).
  const userId = `gh_${ghUser.id}`;

  // 3. Persist identity + token, then mint the session cookie.
  await upsertUser(userId, {
    github_username: ghUser.login,
    github_avatar: ghUser.avatar_url,
  });
  await storeGithubToken(userId, tokenData.access_token);

  const dashboardUrl = new URL("/dashboard", request.nextUrl.origin);

  const res = NextResponse.redirect(dashboardUrl);
  setSessionCookies(res, { id: userId, name: ghUser.login });
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}
