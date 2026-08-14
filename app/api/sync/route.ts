import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { runSync, syncStatus } from "@/lib/sync/runSync";

// Tam yeniden hesaplama parça parça yapılır (her çağrı birkaç gün) — serverless
// zaman limitine sığsın diye. İstemci `done: false` gelirse tekrar çağırır.
export const maxDuration = 60;

/** Yetki: yönetici oturumu VEYA cron/otomasyon için x-sync-secret başlığı. */
async function authorize(req: Request): Promise<string | null> {
  const secret = process.env.SYNC_SECRET;
  if (secret && req.headers.get("x-sync-secret") === secret) return null;
  const session = await getSession();
  if (!session) return "Oturum bulunamadı.";
  if (session.role !== "admin") return "Senkronizasyon için yönetici yetkisi gerekli.";
  return null;
}

export async function POST(req: Request) {
  const denied = await authorize(req);
  if (denied) return NextResponse.json({ error: denied }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const force = Boolean(body?.force);

  try {
    const result = await runSync({ force });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Senkronizasyon hatası" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const denied = await authorize(req);
  if (denied) return NextResponse.json({ error: denied }, { status: 403 });
  try {
    return NextResponse.json(await syncStatus());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Durum okunamadı" },
      { status: 500 }
    );
  }
}
