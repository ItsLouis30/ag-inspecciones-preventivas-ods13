import { describe, expect, it } from "vitest";
import { formatDuration, formatKm, formatMinutes, formatMs, toNumber } from "./format";

describe("formato de magnitudes", () => {
  it("interpreta texto decimal de la API sin alterarlo", () => {
    expect(toNumber("78.3495")).toBe(78.3495);
    expect(toNumber(null)).toBeNull();
    expect(toNumber("abc")).toBeNull();
  });

  it("muestra guion para valores ausentes", () => {
    expect(formatKm(undefined)).toBe("—");
    expect(formatMinutes(null)).toBe("—");
  });

  it("formatea duraciones y tiempos de cómputo", () => {
    expect(formatDuration("219.893333")).toBe("3 h 40 min");
    expect(formatDuration("35.4")).toBe("35 min");
    expect(formatMs(4760.872)).toMatch(/s$/);
    expect(formatMs(1.696)).toMatch(/ms$/);
  });
});
