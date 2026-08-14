import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/supabaseServer";
import { verifyPassword } from "@/lib/auth/hashPassword";
import { createSessionCookie } from "@/lib/auth/session";

interface AppUserRow {
  id: string;
  username: string;
  password_hash: string;
  role: "admin" | "tl";
  tl_name: string | null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");
  if (!username || !password) {
    return NextResponse.json({ error: "Kullanıcı adı ve şifre gerekli." }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("app_users")
    .select("id, username, password_hash, role, tl_name")
    .eq("username", username)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Kullanıcı adı veya şifre hatalı." }, { status: 401 });
  }

  const user = data as unknown as AppUserRow;
  if (!verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "Kullanıcı adı veya şifre hatalı." }, { status: 401 });
  }

  await createSessionCookie({
    userId: user.id,
    username: user.username,
    role: user.role,
    tlName: user.tl_name,
  });

  return NextResponse.json({ ok: true, role: user.role });
}
