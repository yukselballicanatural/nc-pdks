import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "pdks_session";
const ADMIN_ONLY_PREFIXES = ["/takim-yonetimi", "/eslestirme", "/pdks-kontrol", "/zoho-kullanicilar"];

function secretKey() {
  return new TextEncoder().encode(process.env.SESSION_SECRET ?? "");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // /api/cron oturum kullanmaz; zamanlanmış görev tarafından çağrılır ve kendi
  // yetkilendirmesini yapar (CRON_SECRET / x-sync-secret). Burada engellenirse
  // cron login sayfasına yönlendirilir ve otomasyon hiç çalışmaz.
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, secretKey());
    const role = payload.role as string;
    if (role !== "admin" && ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/ozet", req.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
