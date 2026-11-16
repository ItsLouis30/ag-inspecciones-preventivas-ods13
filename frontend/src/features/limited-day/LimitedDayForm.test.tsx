import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { json, mockFetch, renderWithProviders } from "@/test/renderWithProviders";
import { limitedDayResponseFixture, makeStop, scenariosFixture } from "@/test/fixtures";
import { LimitedDayForm } from "./LimitedDayForm";

afterEach(() => vi.unstubAllGlobals());

const baseRoutes = {
  "/scenarios": () => json(scenariosFixture),
  "/scenarios/stops": () => json({ dataset_id: "ds", count: 1, stops: [makeStop()] }),
};

describe("LimitedDayForm", () => {
  it("no dispara la optimización hasta que el usuario la solicita y envía decoder_strategy explícito", async () => {
    const optimize = vi.fn(() => json(limitedDayResponseFixture));
    const fetchMock = mockFetch({ ...baseRoutes, "/optimize/limited-day": optimize });
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<LimitedDayForm />);
    expect(optimize).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /planificar jornada/i }));
    await waitFor(() => expect(optimize).toHaveBeenCalledTimes(1));

    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/optimize/limited-day"));
    const body = JSON.parse(String(call?.[1]?.body));
    expect(body).toMatchObject({
      method: "limited_day_genetic_algorithm",
      decoder_strategy: "prefix",
      experimental: true,
      return_to_origin: true,
      day_limit_min: "240",
      service_time_min: "15",
    });
  });

  it("distingue la estrategia predeterminada de la variante experimental", () => {
    vi.stubGlobal("fetch", mockFetch(baseRoutes));
    renderWithProviders(<LimitedDayForm />);
    expect(screen.getByText("Predeterminada")).toBeInTheDocument();
    expect(screen.getByText("Variante experimental")).toBeInTheDocument();
  });

  it("muestra los errores 422 de FastAPI junto al formulario", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        ...baseRoutes,
        "/optimize/limited-day": () =>
          json({ detail: [{ loc: ["body", "day_limit_min"], msg: "Input should be greater than 0" }] }, 422),
      }),
    );
    renderWithProviders(<LimitedDayForm />);
    await userEvent.click(screen.getByRole("button", { name: /planificar jornada/i }));
    expect(await screen.findByText("Parámetros no válidos")).toBeInTheDocument();
    expect(screen.getAllByText("Input should be greater than 0").length).toBeGreaterThan(0);
  });

  it("bloquea el envío local si la jornada no es positiva", async () => {
    const optimize = vi.fn(() => json(limitedDayResponseFixture));
    vi.stubGlobal("fetch", mockFetch({ ...baseRoutes, "/optimize/limited-day": optimize }));
    renderWithProviders(<LimitedDayForm />);
    const input = screen.getByLabelText("Jornada (min)");
    await userEvent.clear(input);
    await userEvent.type(input, "0");
    await userEvent.click(screen.getByRole("button", { name: /planificar jornada/i }));
    expect(await screen.findByText("La jornada debe ser mayor que 0")).toBeInTheDocument();
    expect(optimize).not.toHaveBeenCalled();
  });
});
