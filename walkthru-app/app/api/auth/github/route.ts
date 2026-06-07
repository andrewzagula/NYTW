import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId || !appUrl) {
    return NextResponse.json(
      { error: "Missing GITHUB_CLIENT_ID or NEXT_PUBLIC_APP_URL" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "repo,read:user",
    redirect_uri: `${appUrl}/api/auth/github/callback`,
  });

  return NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`
  );
}
