import { describe, expect, it } from "vitest";
import { accessIcon, originIcon, shortMarkerId } from "./markers";

describe("identificadores de marcadores", () => {
  it("muestra el código local en el círculo y lo mantiene en una línea", () => {
    expect(shortMarkerId("SRQ-P01")).toBe("P01");
    expect(shortMarkerId("SRQ-N04")).toBe("N04");
    expect(shortMarkerId("MED-02")).toBe("02");
    expect(accessIcon(shortMarkerId("SRQ-P01"), "default", false).options.html).toContain("white-space:nowrap");
  });

  it("diferencia estados de reproducción sin alterar los iconos originales", () => {
    expect(accessIcon("1", "playback_visited", false).options.html).toContain("background:#0F766E");
    expect(accessIcon("2", "playback_current", true).options.html).toContain("background:#2563EB");
    expect(accessIcon("3", "playback_pending", false).options.html).toContain("background:#F1F5F9");
    expect(originIcon("current").options.html).toContain("background:#2563EB");
    expect(originIcon().options.html).toContain("background:#0F172A");
  });
});
