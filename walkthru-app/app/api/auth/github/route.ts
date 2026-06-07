import { NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE } from "@/lib/auth/server";

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId || !appUrl) {
    return NextResponse.json(
      { error: "Missing GITHUB_CLIENT_ID or NEXT_PUBLIC_APP_URL" },
      { status: 500 }
    );
  }

  // CSRF: mint a random state, send it to GitHub, and stash it in a cookie so
  // the callback can confirm the redirect it receives is the one we started.
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "repo,read:user",
    redirect_uri: `${appUrl}/api/auth/github/callback`,
    state,
  });

  const res = NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`
  );
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 600, // 10 minutes — the OAuth round-trip is short.
  });
  return res;
}
