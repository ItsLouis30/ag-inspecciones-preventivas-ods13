"""Errores explícitos para datos, escenarios y rutas inválidas."""


class DataValidationError(ValueError):
    """Error base para entradas que incumplen el contrato del dominio."""


class SchemaValidationError(DataValidationError):
    """Un CSV o JSON no contiene el esquema requerido."""


class IntegrityError(DataValidationError):
    """Un archivo no coincide con el hash del dataset canónico."""


class MatrixValidationError(DataValidationError):
    """Una matriz no es cuadrada, completa o matemáticamente válida."""


class ScenarioValidationError(DataValidationError):
    """La selección de paradas no define un escenario válido."""


class RouteValidationError(DataValidationError):
    """Una secuencia no visita exactamente las paradas del escenario."""

