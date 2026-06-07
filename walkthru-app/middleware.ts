import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const userId =
    request.headers.get("x-replit-user-id") ??
    request.cookies.get("__dev_user_id")?.value;

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/repos", "/api/commits/:path*", "/api/commits-summary"],
};
