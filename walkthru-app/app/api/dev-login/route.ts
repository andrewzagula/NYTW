import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const id = `dev_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

  const response = NextResponse.json({ ok: true, id, name });
  response.cookies.set("__dev_user_id", id, { httpOnly: true, path: "/", sameSite: "lax" });
  response.cookies.set("__dev_user_name", encodeURIComponent(name), {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("__dev_user_id");
  response.cookies.delete("__dev_user_name");
  return response;
}
