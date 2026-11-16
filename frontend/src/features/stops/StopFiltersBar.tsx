import { RotateCcw, Search } from "lucide-react";
import { Input, NativeSelect } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { DEFAULT_FILTERS, isFiltering, type StopFilters } from "./filters";

export function StopFiltersBar({
  filters,
  onChange,
  hazardOptions,
}: {
  filters: StopFilters;
  onChange: (filters: StopFilters) => void;
  hazardOptions: string[];
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Buscar por ID, sector o FTR…"
          aria-label="Buscar puntos críticos por ID, sector o FTR"
          className="pl-9"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <NativeSelect
          aria-label="Filtrar por nivel de peligro"
          value={filters.hazard}
          onChange={(event) => onChange({ ...filters, hazard: event.target.value })}
          className="h-9 text-xs"
        >
          <option value="all">Peligro: todos</option>
          {hazardOptions.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Filtrar por accesibilidad cartográfica"
          value={filters.plausibility}
          onChange={(event) => onChange({ ...filters, plausibility: event.target.value as StopFilters["plausibility"] })}
          className="h-9 text-xs"
        >
          <option value="all">Acceso: todos</option>
          <option value="A">Acceso A</option>
          <option value="B">Acceso B</option>
          <option value="C">Acceso C</option>
        </NativeSelect>
        <NativeSelect
          aria-label="Filtrar por documentación"
          value={filters.documentation}
          onChange={(event) =>
            onChange({ ...filters, documentation: event.target.value as StopFilters["documentation"] })
          }
          className="h-9 text-xs"
        >
          <option value="all">Docs: todos</option>
          <option value="available">Con original</option>
          <option value="missing">Sin original</option>
        </NativeSelect>
      </div>
      {isFiltering(filters) ? (
        <Button variant="link" size="sm" className="self-start" onClick={() => onChange(DEFAULT_FILTERS)}>
          <RotateCcw /> Limpiar filtros
        </Button>
      ) : null}
    </div>
  );
}
