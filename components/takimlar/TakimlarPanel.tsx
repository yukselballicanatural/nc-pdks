"use client";

import { useMemo, useState, useTransition } from "react";
import type { TeamMember, TeamView, UyelikKaynagi } from "@/lib/teams/loadTeams";
import {
  createTeamAction,
  deleteTeamAction,
  moveMemberAction,
  renameTeamAction,
  resetMemberAction,
  setLeaderAction,
  syncKolayAction,
  syncTeamsAction,
} from "@/app/actions/teams";

type ActionResult = { ok: boolean; hata?: string; mesaj?: string };
type Run = (fn: () => Promise<ActionResult>) => void;

/* ── küçük görsel parçalar ── */

const TONES = {
  ok: ["rgba(52,211,153,0.12)", "rgba(52,211,153,0.3)", "#34d399"],
  warn: ["rgba(251,191,36,0.12)", "rgba(251,191,36,0.3)", "#fbbf24"],
  danger: ["rgba(248,113,113,0.12)", "rgba(248,113,113,0.3)", "#f87171"],
  info: ["rgba(56,189,248,0.12)", "rgba(56,189,248,0.3)", "#38bdf8"],
  violet: ["rgba(167,139,250,0.12)", "rgba(167,139,250,0.3)", "#a78bfa"],
  muted: ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.1)", "var(--tx-muted)"],
} as const;

function Badge({
  children,
  tone,
  title,
}: {
  children: React.ReactNode;
  tone: keyof typeof TONES;
  title?: string;
}) {
  const c = TONES[tone];
  return (
    <span
      title={title}
      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ background: c[0], border: `1px solid ${c[1]}`, color: c[2] }}
    >
      {children}
    </span>
  );
}

const KAYNAK_ETIKET: Record<UyelikKaynagi, { text: string; tone: keyof typeof TONES; ipucu: string }> = {
  elle: { text: "elle atandı", tone: "info", ipucu: "Yönetici elle taşıdı — İK kaynağına üstün gelir" },
  kolay: { text: "Kolay İK", tone: "ok", ipucu: "Kolay İK'daki Departman biriminden geldi" },
  zoho: { text: "Zoho", tone: "violet", ipucu: "Kolay'da yok; Zoho rolünden geldi" },
  yok: { text: "kaynak yok", tone: "warn", ipucu: "Hiçbir İK kaynağında takımı bulunamadı" },
};

function Avatar({ ad }: { ad: string }) {
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
      style={{
        background: "rgba(56,189,248,0.12)",
        border: "1px solid rgba(56,189,248,0.22)",
        color: "var(--ac-sky)",
      }}
    >
      {(ad || "?").charAt(0).toLocaleUpperCase("tr-TR")}
    </div>
  );
}

/* ── üye satırı ── */

function MemberRow({
  m,
  teams,
  currentTeamId,
  isAdmin,
  busy,
  run,
}: {
  m: TeamMember;
  teams: TeamView[];
  currentTeamId: string | null;
  isAdmin: boolean;
  busy: boolean;
  run: Run;
}) {
  const k = KAYNAK_ETIKET[m.kaynak];
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2"
      style={{ borderTop: "1px solid rgba(255,255,255,0.045)" }}
    >
      <Avatar ad={m.adSoyad} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm" style={{ color: "var(--tx-primary)" }}>
            {m.adSoyad}
          </span>
          {m.takmaAd && m.takmaAd !== m.adSoyad && (
            <span className="truncate text-[11px]" style={{ color: "var(--ac-sky)" }}>
              ({m.takmaAd})
            </span>
          )}
        </div>
        <div className="truncate text-[11px]" style={{ color: "var(--tx-muted)" }}>
          {m.unvan || "—"}
        </div>
      </div>

      <Badge
        tone={k.tone}
        title={
          m.kaynak === "elle" && m.otomatikTakim
            ? `${k.ipucu}. İK kaynağına göre: ${m.otomatikTakim}`
            : k.ipucu
        }
      >
        {k.text}
      </Badge>

      {m.kolayEslesme === "isim_kismi" && (
        <Badge tone="warn" title="Kolay İK ile kısmi isim eşleşmesi — doğruluğu kontrol edilmeli">
          kontrol
        </Badge>
      )}

      <span className="shrink-0 text-xs tabular-nums" style={{ color: "var(--tx-secondary)" }}>
        {m.sicil}
      </span>

      {isAdmin && (
        <div className="flex shrink-0 items-center gap-1">
          <select
            aria-label="Takım değiştir"
            disabled={busy}
            value={currentTeamId ?? ""}
            onChange={(e) => run(() => moveMemberAction(m.sicil, e.target.value || null))}
            className="input-glass px-1.5 py-1 text-[11px]"
            style={{ maxWidth: 160 }}
          >
            <option value="">— takımsız —</option>
            {teams
              .filter((t) => t.aktif)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.ad}
                </option>
              ))}
          </select>
          {m.kaynak === "elle" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => resetMemberAction(m.sicil))}
              title="Elle atamayı kaldır — İK kaynağındaki takımına geri döner"
              className="rounded-lg px-1.5 py-1 text-[11px]"
              style={{ background: "var(--glass-bg-md)", color: "var(--tx-secondary)" }}
            >
              ↺
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── takım kartı ── */

function TeamCard({
  t,
  teams,
  isAdmin,
  busy,
  run,
}: {
  t: TeamView;
  teams: TeamView[];
  isAdmin: boolean;
  busy: boolean;
  run: Run;
}) {
  const [open, setOpen] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [ad, setAd] = useState(t.ad);

  return (
    <div className="glass-card overflow-hidden" style={{ opacity: t.aktif ? 1 : 0.55 }}>
      <div
        className="flex flex-wrap items-center gap-2 px-4 py-3"
        style={{ borderBottom: open ? "1px solid var(--glass-border)" : "none" }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Daralt" : "Genişlet"}
          className="text-xs"
          style={{ color: "var(--tx-muted)" }}
        >
          {open ? "▾" : "▸"}
        </button>

        {renaming ? (
          <>
            <input
              autoFocus
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              className="input-glass px-2 py-1 text-sm"
              style={{ width: 200 }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                run(() => renameTeamAction(t.id, ad));
                setRenaming(false);
              }}
              className="rounded-lg px-2 py-1 text-[11px]"
              style={{ background: "rgba(56,189,248,0.15)", color: "var(--ac-sky)" }}
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => {
                setAd(t.ad);
                setRenaming(false);
              }}
              className="rounded-lg px-2 py-1 text-[11px]"
              style={{ color: "var(--tx-muted)" }}
            >
              Vazgeç
            </button>
          </>
        ) : (
          <h3 className="text-sm font-semibold" style={{ color: "var(--tx-primary)" }}>
            {t.ad}
          </h3>
        )}

        <Badge tone="muted">{t.uyeler.length} üye</Badge>
        {t.kaynaklar.includes("kolay") && (
          <Badge tone="ok" title={`Kolay İK departmanı: ${t.kolayDepartman}`}>
            Kolay
          </Badge>
        )}
        {t.kaynaklar.includes("zoho") && (
          <Badge tone="violet" title={`Zoho rolü: ${t.sourceRole}`}>
            Zoho
          </Badge>
        )}
        {!t.otomatik && <Badge tone="info">elle açıldı</Badge>}
        {!t.aktif && <Badge tone="danger">pasif</Badge>}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px]" style={{ color: "var(--tx-muted)" }}>
            Lider:
          </span>
          {isAdmin ? (
            <select
              aria-label="Takım lideri"
              disabled={busy}
              value={t.liderSicil ?? ""}
              onChange={(e) => run(() => setLeaderAction(t.id, e.target.value || null))}
              className="input-glass px-1.5 py-1 text-[11px]"
              style={{ maxWidth: 190 }}
            >
              <option value="">{t.liderAd ? `${t.liderAd} (kaynaktan)` : "— atanmadı —"}</option>
              {t.uyeler.map((m) => (
                <option key={m.sicil} value={m.sicil}>
                  {m.adSoyad}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs" style={{ color: "var(--tx-secondary)" }}>
              {t.liderAd ?? "—"}
            </span>
          )}

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setRenaming(true)}
                title="Takım adını değiştir"
                className="rounded-lg px-1.5 py-1 text-[11px]"
                style={{ background: "var(--glass-bg-md)", color: "var(--tx-secondary)" }}
              >
                ✎
              </button>
              {!t.otomatik && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (confirm(`"${t.ad}" takımı silinsin mi? Üyeler İK kaynağındaki takımlarına döner.`)) {
                      run(() => deleteTeamAction(t.id));
                    }
                  }}
                  title="Takımı sil"
                  className="rounded-lg px-1.5 py-1 text-[11px]"
                  style={{ background: "rgba(248,113,113,0.1)", color: "var(--cl-danger)" }}
                >
                  ✕
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {open && (
        <div>
          {t.liderAd && (
            <div
              className="flex items-center gap-2.5 px-3 py-2"
              style={{ background: "rgba(56,189,248,0.05)" }}
            >
              <Avatar ad={t.liderAd} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm" style={{ color: "var(--tx-primary)" }}>
                  {t.liderAd}
                </div>
                <div className="text-[11px]" style={{ color: "var(--tx-muted)" }}>
                  {t.liderSicil ? `Sicil ${t.liderSicil}` : "PDKS'te turnike kaydı yok"}
                </div>
              </div>
              <Badge tone="info">takım lideri</Badge>
            </div>
          )}

          {t.uyeler.length === 0 ? (
            <p className="px-4 py-4 text-xs" style={{ color: "var(--tx-muted)" }}>
              Bu takımda satış kapsamında üye yok.
            </p>
          ) : (
            t.uyeler.map((m) => (
              <MemberRow
                key={m.sicil}
                m={m}
                teams={teams}
                currentTeamId={t.id}
                isAdmin={isAdmin}
                busy={busy}
                run={run}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── ana panel ── */

export default function TakimlarPanel({
  teams,
  takimsiz,
  isAdmin,
  bosMu,
  kolayBosMu,
  kolaySyncedAt,
}: {
  teams: TeamView[];
  takimsiz: TeamMember[];
  isAdmin: boolean;
  bosMu: boolean;
  kolayBosMu: boolean;
  kolaySyncedAt: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [mesaj, setMesaj] = useState<{ tip: "ok" | "hata"; text: string } | null>(null);
  const [ara, setAra] = useState("");
  const [yeniAd, setYeniAd] = useState("");
  const [pasifGoster, setPasifGoster] = useState(false);

  const run: Run = (fn) => {
    setMesaj(null);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) setMesaj(r.mesaj ? { tip: "ok", text: r.mesaj } : null);
      else setMesaj({ tip: "hata", text: r.hata ?? "İşlem başarısız." });
    });
  };

  const q = ara.trim().toLocaleLowerCase("tr-TR");
  const eslesir = (m: TeamMember) =>
    !q ||
    `${m.adSoyad} ${m.takmaAd ?? ""} ${m.sicil} ${m.unvan}`.toLocaleLowerCase("tr-TR").includes(q);

  const gorunen = useMemo(() => {
    const list = teams.filter((t) => t.aktif || pasifGoster);
    if (!q) return list;
    return list
      .map((t) => ({ ...t, uyeler: t.uyeler.filter(eslesir) }))
      .filter((t) => t.uyeler.length > 0 || t.ad.toLocaleLowerCase("tr-TR").includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams, q, pasifGoster]);

  const gorunenTakimsiz = takimsiz.filter(eslesir);

  const Mesaj = () =>
    mesaj ? (
      <p
        className="rounded-xl px-3 py-2 text-xs"
        style={{
          background: mesaj.tip === "ok" ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
          border: `1px solid ${mesaj.tip === "ok" ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)"}`,
          color: mesaj.tip === "ok" ? "var(--cl-ok)" : "var(--cl-danger)",
        }}
      >
        {mesaj.text}
      </p>
    ) : null;

  /* İlk kurulum ekranı */
  if (bosMu) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold" style={{ color: "var(--tx-primary)" }}>
          Takımlar hazırlanıyor…
        </h3>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed" style={{ color: "var(--tx-secondary)" }}>
          Takım yapısı iki kaynaktan <span style={{ color: "var(--tx-primary)" }}>otomatik</span>{" "}
          türetilir: Kolay İK&apos;daki <span style={{ color: "var(--tx-primary)" }}>Departman</span>{" "}
          birimi ve Zoho&apos;daki <span style={{ color: "var(--tx-primary)" }}>role</span> alanı.
          Arka planda çalışan senkronizasyon bunu kendisi kuracak — birkaç dakika içinde bu sayfayı
          yenilediğinizde takımlar görünür.
        </p>
        <p className="mt-2 text-xs" style={{ color: "var(--tx-muted)" }}>
          Beklemek istemiyorsanız aşağıdaki düğmeyle hemen başlatabilirsiniz.
        </p>
        {isAdmin && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(syncKolayAction)}
            className="mt-3 rounded-xl px-4 py-2 text-sm font-semibold"
            style={{
              background: "linear-gradient(135deg, rgba(56,189,248,0.9), rgba(6,214,160,0.85))",
              color: "#06091a",
            }}
          >
            {pending ? "Kuruluyor…" : "Şimdi Kur"}
          </button>
        )}
        <div className="mt-3">
          <Mesaj />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass-card flex flex-wrap items-center gap-2.5 p-3.5">
        <input
          value={ara}
          onChange={(e) => setAra(e.target.value)}
          placeholder="Kişi, sicil veya takım ara…"
          className="input-glass px-3 py-2 text-sm"
          style={{ width: 264 }}
        />
        <label className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--tx-secondary)" }}>
          <input type="checkbox" checked={pasifGoster} onChange={(e) => setPasifGoster(e.target.checked)} />
          Pasif takımlar
        </label>

        {isAdmin && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              value={yeniAd}
              onChange={(e) => setYeniAd(e.target.value)}
              placeholder="Yeni takım adı"
              className="input-glass px-2.5 py-1.5 text-xs"
              style={{ width: 150 }}
            />
            <button
              type="button"
              disabled={pending || yeniAd.trim().length < 2}
              onClick={() => {
                run(() => createTeamAction(yeniAd));
                setYeniAd("");
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{ background: "var(--glass-bg-hi)", color: "var(--tx-primary)" }}
            >
              Takım Ekle
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(syncTeamsAction)}
              title="Önbellekteki İK verisinden takım tanımlarını tazele"
              className="rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{ background: "var(--glass-bg-hi)", color: "var(--tx-primary)" }}
            >
              Takımları Tazele
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(syncKolayAction)}
              title="Otomatiği beklemeden Kolay İK'dan personel ve birim bilgisini şimdi çek"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{
                background: "linear-gradient(135deg, rgba(56,189,248,0.85), rgba(6,214,160,0.8))",
                color: "#06091a",
              }}
            >
              {pending ? "Eşitleniyor…" : "Kolay İK ile Eşitle"}
            </button>
          </div>
        )}
      </div>

      <Mesaj />

      {kolayBosMu && (
        <p
          className="rounded-xl px-3 py-2.5 text-xs leading-relaxed"
          style={{
            background: "rgba(251,191,36,0.1)",
            border: "1px solid rgba(251,191,36,0.25)",
            color: "#fbbf24",
          }}
        >
          Kolay İK personel önbelleği henüz doldurulmadı — takımlar şu an yalnızca Zoho&apos;dan
          türetiliyor. Arka plan senkronizasyonu bunu kendisi tazeleyecek; beklemek istemezseniz
          <span style={{ color: "var(--tx-primary)" }}> Kolay İK ile Eşitle</span> düğmesini
          kullanabilirsiniz.
        </p>
      )}

      <p className="max-w-4xl text-[11px] leading-relaxed" style={{ color: "var(--tx-muted)" }}>
        Üyelik her açılışta canlı çözülür; sıra <span style={{ color: "var(--ac-sky)" }}>elle atama</span>{" "}
        → <span style={{ color: "var(--cl-ok)" }}>Kolay İK</span> →{" "}
        <span style={{ color: "var(--cl-violet)" }}>Zoho</span> şeklindedir. Yani biri Kolay veya
        Zoho&apos;da takım değiştirdiğinde burası kendiliğinden güncellenir; elle yaptığınız taşımalar
        ise korunur ve ↺ ile otomatiğe döndürülebilir. İki kaynak farklı kişileri kapsadığı için
        birlikte kullanılıyor: Kolay İstanbul kadrosunu, Zoho Fas ekiplerini de içeriyor.
        {kolaySyncedAt && (
          <> Kolay verisi son eşitleme: {new Date(kolaySyncedAt).toLocaleString("tr-TR")}.</>
        )}
      </p>

      <div className="grid gap-3.5 xl:grid-cols-2">
        {gorunen.map((t) => (
          <TeamCard key={t.id} t={t} teams={teams} isAdmin={isAdmin} busy={pending} run={run} />
        ))}
      </div>

      {gorunen.length === 0 && (
        <p className="glass-card p-6 text-center text-sm" style={{ color: "var(--tx-muted)" }}>
          Aramaya uyan takım bulunamadı.
        </p>
      )}

      {gorunenTakimsiz.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--glass-border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--tx-primary)" }}>
              Takımsız Personel
            </h3>
            <p className="mt-0.5 text-[11px]" style={{ color: "var(--tx-muted)" }}>
              Ne Kolay İK&apos;da ne Zoho&apos;da takımı bulunabilen satış personeli. Buradan elle bir
              takıma atayabilirsiniz.
            </p>
          </div>
          {gorunenTakimsiz.map((m) => (
            <MemberRow
              key={m.sicil}
              m={m}
              teams={teams}
              currentTeamId={null}
              isAdmin={isAdmin}
              busy={pending}
              run={run}
            />
          ))}
        </div>
      )}
    </div>
  );
}
