// Kaynak: pdks_app_stabil_v8_4.py satır 89-105 (dkp, dks). Birebir port.

/** Dakikayı h:mm formatında gösterir. */
export function dkp(d: number | null | undefined): string {
  const v = Number(d ?? 0) || 0;
  const abs = Math.abs(v);
  return `${Math.floor(abs / 60)}:${String(Math.floor(abs % 60)).padStart(2, "0")}`;
}

/** Dakika farkını +/-h:mm formatında gösterir. */
export function dks(d: number | null | undefined): string {
  const v = Number(d ?? 0) || 0;
  if (v === 0) return "0:00";
  const abs = Math.abs(v);
  return `${v < 0 ? "-" : "+"}${Math.floor(abs / 60)}:${String(Math.floor(abs % 60)).padStart(2, "0")}`;
}

/** Dakikayı saate çevirir (dashboard kartları için). */
export function saat(d: number): string {
  return (d / 60).toFixed(1);
}
