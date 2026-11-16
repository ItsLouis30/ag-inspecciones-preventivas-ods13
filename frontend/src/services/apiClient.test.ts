import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest, parseErrorBody } from "./apiClient";

afterEach(() => vi.unstubAllGlobals());

describe("parseErrorBody", () => {
  it("convierte errores 422 de Pydantic en incidencias por campo", () => {
    const error = parseErrorBody(422, {
      detail: [{ loc: ["body", "evolution", "population_size"], msg: "Input should be greater than or equal to 1" }],
    });
    expect(error.kind).toBe("validation");
    expect(error.issues).toEqual([
      { path: ["evolution", "population_size"], message: "Input should be greater than or equal to 1" },
    ]);
  });

  it("conserva el detalle de errores de dominio con error_type", () => {
    const error = parseErrorBody(422, { detail: "Paradas desconocidas: ['PXX'].", error_type: "ScenarioValidationError" });
    expect(error.kind).toBe("domain");
    expect(error.title).toBe("Escenario no válido");
    expect(error.message).toContain("PXX");
  });

  it("identifica errores de integridad del dataset", () => {
    const error = parseErrorBody(422, { detail: "hash", error_type: "IntegrityError" });
    expect(error.title).toBe("Error de integridad del dataset");
  });

  it("clasifica 5xx como error del servidor", () => {
    expect(parseErrorBody(500, null).kind).toBe("server");
  });
});

describe("apiRequest", () => {
  it("lanza ApiError de red cuando la API no está disponible", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(apiRequest("/health")).rejects.toMatchObject({ kind: "network" });
  });

  it("devuelve JSON en respuestas correctas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "ok" }), { status: 200 })),
    );
    await expect(apiRequest<{ status: string }>("/health")).resolves.toEqual({ status: "ok" });
  });

  it("propaga el 422 como ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: [{ loc: ["body", "method"], msg: "bad" }] }), { status: 422 })),
    );
    const error: unknown = await apiRequest("/optimize/tsp", { method: "POST", body: {} }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe("validation");
  });
});
