import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ChromosomeViewer } from "./ChromosomeViewer";

describe("cromosoma real del Modelo B", () => {
  it("muestra todos los genes, distingue omitidas y conserva el orden decodificado", async () => {
    render(<ChromosomeViewer genes={["P03", "P01", "P02"]} route={["ORIGEN", "P02", "P03", "ORIGEN"]} omitted={["P01"]} seed={11} distanceKm="12.5" veryHigh={2} totalSelected={2} totalTimeMin="120" decoder="feasible_insertion" />);
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(screen.getByText(/ORIGEN → P02 → P03 → ORIGEN/)).toBeInTheDocument();
    expect(screen.getByText(/puede diferir del orden final/)).toBeInTheDocument();
    await userEvent.click(screen.getByTitle("P01 · posición 2"));
    expect(screen.getByTitle("P01 · posición 2")).toBeInTheDocument();
    expect(screen.getByText(/Muy Alto: 2/)).toBeInTheDocument();
  });
});
