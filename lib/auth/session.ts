// Basit custom session (Supabase Auth DEĞİL) — bkz. plan §"Auth Akışı".
// JWT, httpOnly cookie'de tutulur. Admin/TL ayrımı Config.mode'un web karşılığı.
import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "pdks_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 saat

export interface SessionPayload {
  userId: string;
  username: string;
  role: "admin" | "tl";
  tlName: string | null;
}

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET env değişkeni tanımlı değil.");
  return new TextEncoder().encode(secret);
}

export async function createSessionCookie(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      userId: payload.userId as string,
      username: payload.username as string,
      role: payload.role as "admin" | "tl",
      tlName: (payload.tlName as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
