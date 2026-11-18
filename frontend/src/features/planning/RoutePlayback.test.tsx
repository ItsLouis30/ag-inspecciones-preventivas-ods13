import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { limitedDayPlanFixture } from "@/test/fixtures";
import { RoutePlayback } from "./RoutePlayback";

afterEach(() => vi.useRealTimers());

describe("reproducción de la secuencia", () => {
  it("avanza por el orden de la API, se puede pausar y termina en el origen", () => {
    vi.useFakeTimers();
    const onStep = vi.fn();
    const visits = limitedDayPlanFixture.visits;
    render(<RoutePlayback visits={visits} onStep={onStep} />);

    const steps = screen.getAllByRole("button", { name: /^Paso \d+:/ });
    expect(steps).toHaveLength(visits.length);
    expect(steps[1]).toHaveClass("bg-muted/60");
    fireEvent.click(screen.getByRole("button", { name: "Reproducir recorrido" }));
    expect(onStep).toHaveBeenLastCalledWith(visits[0], 0);
    expect(steps[0]).toHaveClass("bg-river", "ring-river/25");
    expect(steps[1]).toHaveClass("bg-slate-100");

    act(() => vi.advanceTimersByTime(1200));
    expect(onStep).toHaveBeenLastCalledWith(visits[1], 1);
    expect(steps[0]).toHaveClass("bg-primary");
    expect(steps[1]).toHaveClass("bg-river");
    expect(steps[2]).toHaveClass("bg-slate-100");
    fireEvent.click(screen.getByRole("button", { name: "Pausar recorrido" }));
    act(() => vi.advanceTimersByTime(3000));
    expect(onStep).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Visita siguiente" }));
    expect(onStep).toHaveBeenLastCalledWith(visits[2], 2);
    expect(screen.getByText(/Regreso al origen/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reiniciar recorrido" }));
    expect(onStep).toHaveBeenLastCalledWith(null, null);
    expect(steps[0]).toHaveClass("bg-muted/60");
    expect(steps[1]).toHaveClass("bg-muted/60");
  });
});
