import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser, storeGithubToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const user = getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Missing GitHub OAuth credentials" },
      { status: 500 }
    );
  }

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

  await storeGithubToken(user.id, tokenData.access_token);

  return NextResponse.redirect(new URL("/test", request.url));
}
