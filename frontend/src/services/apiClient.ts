/**
 * Cliente HTTP tipado para la API FastAPI.
 * Centraliza la URL base, la serialización JSON, la clasificación de errores y las descargas.
 */

const DEFAULT_BASE_URL = "http://127.0.0.1:8000/api/v1";

export const API_BASE_URL: string = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? DEFAULT_BASE_URL
).replace(/\/+$/, "");

export type ApiErrorKind =
  | "network" // API no disponible o CORS
  | "validation" // HTTP 422 de Pydantic (campos)
  | "domain" // HTTP 4xx con error_type del dominio (escenario, dataset…)
  | "aborted" // cancelado por el usuario
  | "server"; // 5xx u otro inesperado

export interface FieldIssue {
  /** Ruta del campo sin el prefijo "body", p. ej. ["evolution", "population_size"]. */
  path: (string | number)[];
  message: string;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly errorType: string | null;
  readonly issues: FieldIssue[];

  constructor(
    kind: ApiErrorKind,
    message: string,
    options: { status?: number | null; errorType?: string | null; issues?: FieldIssue[] } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = options.status ?? null;
    this.errorType = options.errorType ?? null;
    this.issues = options.issues ?? [];
  }

  /** Título breve en español para mostrar al usuario. */
  get title(): string {
    switch (this.kind) {
      case "network":
        return "No se pudo conectar con la API";
      case "validation":
        return "Parámetros no válidos";
      case "domain":
        return this.errorType === "ScenarioValidationError"
          ? "Escenario no válido"
          : this.errorType?.toLowerCase().includes("integrity")
            ? "Error de integridad del dataset"
            : "La API rechazó la solicitud";
      case "aborted":
        return "Solicitud cancelada";
      default:
        return "Error inesperado del servidor";
    }
  }
}

interface PydanticIssue {
  loc?: (string | number)[];
  msg?: string;
}

/** Convierte el cuerpo de error de FastAPI en un ApiError sin perder el detalle. */
export function parseErrorBody(status: number, body: unknown): ApiError {
  const detail = (body as { detail?: unknown } | null)?.detail;
  const errorType = (body as { error_type?: string } | null)?.error_type ?? null;

  if (Array.isArray(detail)) {
    const issues: FieldIssue[] = (detail as PydanticIssue[]).map((item) => ({
      path: (item.loc ?? []).filter((part) => part !== "body"),
      message: item.msg ?? "Valor no válido",
    }));
    const message = issues
      .map((issue) => (issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
      .join(" · ");
    return new ApiError("validation", message || "Solicitud no válida", { status, issues });
  }

  const text = typeof detail === "string" ? detail : `HTTP ${status}`;
  if (status >= 400 && status < 500) {
    return new ApiError(status === 422 && !errorType ? "validation" : "domain", text, {
      status,
      errorType,
    });
  }
  return new ApiError("server", text, { status, errorType });
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
}

async function rawRequest(path: string, { method = "GET", body, signal }: RequestOptions): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      throw new ApiError("aborted", "La espera de la respuesta fue cancelada desde el navegador.");
    }
    throw new ApiError(
      "network",
      `No hay respuesta de ${API_BASE_URL}. Verifica que el backend esté en ejecución (cd backend && python -m app.server).`,
    );
  }
  if (!response.ok) {
    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }
    throw parseErrorBody(response.status, parsed);
  }
  return response;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await rawRequest(path, options);
  return (await response.json()) as T;
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  return match?.[1] ? decodeURIComponent(match[1]) : fallback;
}

/** Ejecuta un POST que devuelve un archivo y dispara su descarga en el navegador. */
export async function apiDownload(
  path: string,
  body: unknown,
  fallbackName: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await rawRequest(path, { method: "POST", body, signal });
  const blob = await response.blob();
  const filename = filenameFromDisposition(response.headers.get("Content-Disposition"), fallbackName);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
