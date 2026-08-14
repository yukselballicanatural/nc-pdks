import "server-only";
import { supabaseServer } from "../supabaseServer";
import { ReaderConfig } from "../../engine/readerConfig";
import type { ReaderArea } from "../../engine/types";

/** reader_rules tablosundan ReaderConfig kurar (ReaderConfig.__init__ portu). */
export async function loadReaderConfig(): Promise<ReaderConfig> {
  const sb = supabaseServer();
  const { data, error } = await sb.from("reader_rules").select("reader_name, category");
  if (error) throw new Error(`reader_rules okunamadı: ${error.message}`);
  const rows = (data ?? []) as unknown as { reader_name: string; category: ReaderArea }[];
  return new ReaderConfig({
    work_readers: rows.filter((r) => r.category === "work").map((r) => r.reader_name),
    break_readers: rows.filter((r) => r.category === "break").map((r) => r.reader_name),
    ignore_readers: rows.filter((r) => r.category === "ignore").map((r) => r.reader_name),
  });
}

/** ReaderConfig.set_area portu — upsert ile üzerine yazar. */
export async function setReaderArea(readerName: string, area: ReaderArea): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb
    .from("reader_rules")
    .upsert(
      { reader_name: readerName, category: area, updated_at: new Date().toISOString() },
      { onConflict: "reader_name" }
    );
  if (error) throw new Error(`reader_rules yazılamadı: ${error.message}`);
}

/** Varsayılana döndür (kayıt silinince readerIsTurnike() varsayılanı devreye girer). */
export async function resetReaderArea(readerName: string): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb.from("reader_rules").delete().eq("reader_name", readerName);
  if (error) throw new Error(`reader_rules silinemedi: ${error.message}`);
}
