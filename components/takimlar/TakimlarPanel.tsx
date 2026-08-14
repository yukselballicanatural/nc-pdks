"use client";

import { useMemo, useState, useTransition } from "react";
import type { TeamMember, TeamView } from "@/lib/teams/loadTeams";
import {
  createTeamAction,
  deleteTeamAction,
  moveMemberAction,
  renameTeamAction,
  resetMemberAction,
  setLeaderAction,
  syncTeamsAction,
} from "@/app/actions/teams";

/* ── küçük yardımcı görsel parçalar ── */

function Badge({
  children,
  tone,
  title,
}: {
  children: React.ReactNode;
  tone: "ok" | "warn" | "danger" | "info" | "muted";
  title?: string;
}) {
  const c = {
    ok: ["rgba(52,211,153,0.12)", "rgba(52,211,153,0.3)", "#34d399"],
    warn: ["rgba(251,191,36,0.12)", "rgba(251,191,36,0.3)", "#fbbf24"],
    danger: ["rgba(248,113,113,0.12)", "rgba(248,113,113,0.3)", "#f87171"],
    info: ["rgba(56,189,248,0.12)", "rgba(56,189,248,0.3)", "#38bdf8"],
    muted: ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.1)", "var(--tx-muted)"],
  }[tone];
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
  onMove,
  onReset,
}: {
  m: TeamMember;
  teams: TeamView[];
  currentTeamId: string | null;
  isAdmin: boolean;
  busy: boolean;
  onMove: (zohoId: string, teamId: string | null) => void;
  onReset: (zohoId: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2"
      style={{ borderTop: "1px solid rgba(255,255,255,0.045)" }}
    >
      <Avatar ad={m.takmaAd || m.gercekAd} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm" style={{ color: "var(--tx-primary)" }}>
            {m.takmaAd || m.gercekAd || "(isimsiz)"}
          </span>
          {m.elleAtandi && (
            <Badge tone="info" title={m.zohoTakim ? `Zoho'ya göre: ${m.zohoTakim}` : "Zoho'da takımı yok"}>
              elle atandı
            </Badge>
          )}
        </div>
        <div className="truncate text-[11px]" style={{ color: "var(--tx-muted)" }}>
          {m.gercekAd && m.gercekAd !== m.takmaAd ? m.gercekAd : m.role}
          {m.region ? ` · ${m.region}` : ""}
        </div>
      </div>

      {m.sicil ? (
        <span className="shrink-0 text-xs tabular-nums" style={{ color: "var(--tx-secondary)" }}>
          {m.sicil}
        </span>
      ) : (
        <Badge tone="warn" title="Zoho kaydı PDKS sicil numarasıyla eşleşmedi">
          sicil yok
        </Badge>
      )}

      {m.sicil && !m.pdksVar && (
        <Badge tone="muted" title="Satış kapsamı dışında — PDKS hesabına girmiyor">
          kapsam dışı
        </Badge>
      )}

      {isAdmin && (
        <div className="flex shrink-0 items-center gap-1">
          <select
            aria-label="Takım değiştir"
            disabled={busy}
            value={currentTeamId ?? ""}
            onChange={(e) => onMove(m.zohoId, e.target.value === "" ? null : e.target.value)}
            className="input-glass px-1.5 py-1 text-[11px]"
            style={{ maxWidth: 150 }}
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
          {m.elleAtandi && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onReset(m.zohoId)}
              title="Elle atamayı kaldır — Zoho'daki takımına geri döner"
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
  run: (fn: () => Promise<{ ok: boolean; hata?: string; mesaj?: string }>) => void;
}) {
  const [open, setOpen] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [ad, setAd] = useState(t.ad);

  const eslesmeyen = t.uyeler.filter((u) => !u.sicil).length;
  const liderAdaylari = [t.lider, ...t.uyeler].filter(Boolean) as TeamMember[];

  return (
    <div className="glass-card overflow-hidden" style={{ opacity: t.aktif ? 1 : 0.55 }}>
      {/* başlık */}
      <div
        className="flex flex-wrap items-center gap-2 px-4 py-3"
        style={{ borderBottom: open ? "1px solid var(--glass-border)" : "none" }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
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
        {t.otomatik ? (
          <Badge tone="ok" title={`Zoho rolü: ${t.sourceRole}`}>
            otomatik
          </Badge>
        ) : (
          <Badge tone="info">elle açıldı</Badge>
        )}
        {!t.aktif && <Badge tone="danger">pasif</Badge>}
        {eslesmeyen > 0 && <Badge tone="warn">{eslesmeyen} sicil yok</Badge>}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px]" style={{ color: "var(--tx-muted)" }}>
            Lider:
          </span>
          {isAdmin ? (
            <select
              aria-label="Takım lideri"
              disabled={busy}
              value={t.lider?.zohoId ?? ""}
              onChange={(e) => run(() => setLeaderAction(t.id, e.target.value || null))}
              className="input-glass px-1.5 py-1 text-[11px]"
              style={{ maxWidth: 190 }}
            >
              <option value="">— atanmadı —</option>
              {liderAdaylari.map((m) => (
                <option key={m.zohoId} value={m.zohoId}>
                  {m.takmaAd || m.gercekAd}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs" style={{ color: "var(--tx-secondary)" }}>
              {t.lider ? t.lider.takmaAd || t.lider.gercekAd : "—"}
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
                    if (confirm(`"${t.ad}" takımı silinsin mi? Üyeler Zoho'daki takımlarına döner.`)) {
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
          {t.lider && (
            <div
              className="flex items-center gap-2.5 px-3 py-2"
              style={{ background: "rgba(56,189,248,0.05)" }}
            >
              <Avatar ad={t.lider.takmaAd || t.lider.gercekAd} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm" style={{ color: "var(--tx-primary)" }}>
                  {t.lider.takmaAd || t.lider.gercekAd}
                </div>
                <div className="truncate text-[11px]" style={{ color: "var(--tx-muted)" }}>
                  {t.liderRole ?? t.lider.role}
                </div>
              </div>
              <Badge tone="info">takım lideri</Badge>
              {t.lider.sicil && (
                <span className="text-xs tabular-nums" style={{ color: "var(--tx-secondary)" }}>
                  {t.lider.sicil}
                </span>
              )}
            </div>
          )}

          {t.uyeler.length === 0 ? (
            <p className="px-4 py-4 text-xs" style={{ color: "var(--tx-muted)" }}>
              Bu takımda üye yok.
            </p>
          ) : (
            t.uyeler.map((m) => (
              <MemberRow
                key={m.zohoId}
                m={m}
                teams={teams}
                currentTeamId={t.id}
                isAdmin={isAdmin}
                busy={busy}
                onMove={(z, id) => run(() => moveMemberAction(z, id))}
                onReset={(z) => run(() => resetMemberAction(z))}
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
}: {
  teams: TeamView[];
  takimsiz: TeamMember[];
  isAdmin: boolean;
  bosMu: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [mesaj, setMesaj] = useState<{ tip: "ok" | "hata"; text: string } | null>(null);
  const [ara, setAra] = useState("");
  const [yeniAd, setYeniAd] = useState("");
  const [pasifGoster, setPasifGoster] = useState(false);

  function run(fn: () => Promise<{ ok: boolean; hata?: string; mesaj?: string }>) {
    setMesaj(null);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) setMesaj(r.mesaj ? { tip: "ok", text: r.mesaj } : null);
      else setMesaj({ tip: "hata", text: r.hata ?? "İşlem başarısız." });
    });
  }

  const q = ara.trim().toLocaleLowerCase("tr-TR");
  const eslesir = (m: TeamMember) =>
    !q ||
    (m.takmaAd + " " + m.gercekAd + " " + (m.sicil ?? "") + " " + m.role)
      .toLocaleLowerCase("tr-TR")
      .includes(q);

  const gorunen = useMemo(() => {
    const list = teams.filter((t) => t.aktif || pasifGoster);
    if (!q) return list;
    // Arama: eşleşen üyesi olan takımlar, yalnızca eşleşen üyelerle.
    return list
      .map((t) => ({ ...t, uyeler: t.uyeler.filter(eslesir) }))
      .filter(
        (t) => t.uyeler.length > 0 || t.ad.toLocaleLowerCase("tr-TR").includes(q) || (t.lider && eslesir(t.lider))
      );
  }, [teams, q, pasifGoster]);

  const gorunenTakimsiz = takimsiz.filter(eslesir);

  if (bosMu) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold" style={{ color: "var(--tx-primary)" }}>
          Takımlar henüz oluşturulmadı
        </h3>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--tx-secondary)" }}>
          Takım yapısı Zoho&apos;daki <span style={{ color: "var(--tx-primary)" }}>role</span> alanından
          türetilir. Başlatmak için aşağıdaki düğmeye basın — Zoho&apos;daki her takım rolü için bir takım
          oluşturulur ve liderleri otomatik atanır.
        </p>
        {isAdmin ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(syncTeamsAction)}
            className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold"
            style={{
              background: "linear-gradient(135deg, rgba(56,189,248,0.9), rgba(6,214,160,0.85))",
              color: "#06091a",
            }}
          >
            {pending ? "Oluşturuluyor…" : "Takımları Zoho'dan Oluştur"}
          </button>
        ) : (
          <p className="mt-3 text-xs" style={{ color: "var(--tx-muted)" }}>
            Bu işlem için yönetici yetkisi gerekli.
          </p>
        )}
        {mesaj && (
          <p
            className="mt-3 text-xs"
            style={{ color: mesaj.tip === "ok" ? "var(--cl-ok)" : "var(--cl-danger)" }}
          >
            {mesaj.text}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* araç çubuğu */}
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
          Pasif takımları göster
        </label>

        {isAdmin && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              value={yeniAd}
              onChange={(e) => setYeniAd(e.target.value)}
              placeholder="Yeni takım adı"
              className="input-glass px-2.5 py-1.5 text-xs"
              style={{ width: 160 }}
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
              title="Zoho'daki yeni/değişen takım rollerini al"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{
                background: "linear-gradient(135deg, rgba(56,189,248,0.85), rgba(6,214,160,0.8))",
                color: "#06091a",
              }}
            >
              {pending ? "Eşitleniyor…" : "Zoho ile Eşitle"}
            </button>
          </div>
        )}
      </div>

      {mesaj && (
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
      )}

      <p className="text-[11px] leading-relaxed" style={{ color: "var(--tx-muted)" }}>
        Üyelik Zoho&apos;daki <span style={{ color: "var(--tx-secondary)" }}>role</span> alanından her
        açılışta canlı türetilir — biri Zoho&apos;da takım değiştirdiğinde burası kendiliğinden güncellenir.
        Elle yaptığınız taşımalar <span style={{ color: "var(--ac-sky)" }}>elle atandı</span> etiketiyle
        işaretlenir ve Zoho&apos;dan gelen değere üstün gelir; ↺ ile otomatik akışa geri döndürebilirsiniz.
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

      {/* takımsız kişiler */}
      {gorunenTakimsiz.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--glass-border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--tx-primary)" }}>
              Takımsız Kişiler
            </h3>
            <p className="mt-0.5 text-[11px]" style={{ color: "var(--tx-muted)" }}>
              Zoho rolü bir takıma karşılık gelmeyenler (Finans, BT, üst yönetim vb.) ve takımdan
              çıkarılanlar. Buradan bir takıma atayabilirsiniz.
            </p>
          </div>
          {gorunenTakimsiz.map((m) => (
            <MemberRow
              key={m.zohoId}
              m={m}
              teams={teams}
              currentTeamId={null}
              isAdmin={isAdmin}
              busy={pending}
              onMove={(z, id) => run(() => moveMemberAction(z, id))}
              onReset={(z) => run(() => resetMemberAction(z))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
