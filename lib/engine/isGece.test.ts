import { describe, expect, it } from "vitest";
import { isGece } from "./isGece";
import { DEF_GECE_TL } from "./constants";

describe("isGece (ARCHITECTURE.md §2 kuralı)", () => {
  it("vardiya alanı 'gece' ise doğrudan true döner", () => {
    expect(isGece({ vardiya: "gece", takim_lideri: "Baska Biri" }, DEF_GECE_TL)).toBe(true);
  });

  it("vardiya alanı 'gunduz' ise doğrudan false döner (TL gece listesinde olsa da)", () => {
    expect(isGece({ vardiya: "gunduz", takim_lideri: "Ahmed Anwar" }, DEF_GECE_TL)).toBe(false);
  });

  it("vardiya boşsa TL adı gece listesiyle TAM eşleşirse true", () => {
    expect(isGece({ vardiya: "", takim_lideri: "Ahmed Anwar" }, DEF_GECE_TL)).toBe(true);
  });

  it("substring eşleşmesi yeterli değildir — tam eşleşme şart (2026-07-16 düzeltmesi)", () => {
    expect(isGece({ vardiya: "", takim_lideri: "Ahmed Anwar Junior" }, DEF_GECE_TL)).toBe(false);
    expect(isGece({ vardiya: "", takim_lideri: "Ahmed" }, DEF_GECE_TL)).toBe(false);
  });

  it("kullanıcı yoksa false döner", () => {
    expect(isGece(null, DEF_GECE_TL)).toBe(false);
  });

  it("Türkçe karakter farkları normalize edilerek eşleşir", () => {
    expect(isGece({ vardiya: "", takim_lideri: "AHMED ANWAR" }, DEF_GECE_TL)).toBe(true);
  });
});
