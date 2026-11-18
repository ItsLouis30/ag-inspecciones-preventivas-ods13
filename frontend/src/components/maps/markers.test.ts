import { describe, expect, it } from "vitest";
import { accessIcon, shortMarkerId } from "./markers";

describe("identificadores de marcadores", () => {
  it("muestra el código local en el círculo y lo mantiene en una línea", () => {
    expect(shortMarkerId("SRQ-P01")).toBe("P01");
    expect(shortMarkerId("SRQ-N04")).toBe("N04");
    expect(shortMarkerId("MED-02")).toBe("02");
    expect(accessIcon(shortMarkerId("SRQ-P01"), "default", false).options.html).toContain("white-space:nowrap");
  });
});
