"""Lectura estricta de matrices CSV dirigidas."""

from __future__ import annotations

import csv
import hashlib
from decimal import Decimal, InvalidOperation
from pathlib import Path

from app.domain.errors import IntegrityError, MatrixValidationError, SchemaValidationError
from app.domain.matrix import DirectedMatrix


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def load_matrix_csv(
    path: Path,
    *,
    name: str,
    unit: str,
    expected_sha256: str | None = None,
) -> DirectedMatrix:
    if not path.is_file():
        raise SchemaValidationError(f"No existe la matriz requerida: {path}.")

    actual_hash = sha256_file(path)
    if expected_sha256 and actual_hash != expected_sha256.upper():
        raise IntegrityError(
            f"Hash inválido para {path}: esperado {expected_sha256.upper()}, obtenido {actual_hash}."
        )

    with path.open(encoding="utf-8-sig", newline="") as source:
        rows = list(csv.reader(source))
    if len(rows) < 2:
        raise SchemaValidationError(f"{path} no contiene encabezado y filas de datos.")
    header = rows[0]
    if not header or header[0] != "origin_destination":
        raise SchemaValidationError(
            f"La primera columna de {path} debe llamarse 'origin_destination'."
        )
    column_ids = tuple(header[1:])
    if not column_ids or any(not node_id for node_id in column_ids):
        raise MatrixValidationError(f"{path} contiene IDs de columna vacíos.")
    if len(column_ids) != len(set(column_ids)):
        raise MatrixValidationError(f"{path} contiene columnas duplicadas.")
    if len(rows) - 1 != len(column_ids):
        raise MatrixValidationError(
            f"{path} no es cuadrada: {len(rows) - 1} filas para {len(column_ids)} columnas."
        )

    row_ids: list[str] = []
    values: list[tuple[Decimal, ...]] = []
    expected_width = len(header)
    for line_number, row in enumerate(rows[1:], start=2):
        if len(row) != expected_width:
            raise MatrixValidationError(
                f"Fila {line_number} de {path} tiene {len(row)} columnas; se esperaban {expected_width}."
            )
        row_id = row[0]
        if not row_id:
            raise MatrixValidationError(f"Fila {line_number} de {path} tiene ID vacío.")
        row_ids.append(row_id)
        parsed: list[Decimal] = []
        for column_id, raw_value in zip(column_ids, row[1:]):
            if raw_value.strip() == "":
                raise MatrixValidationError(
                    f"Arco desconectado o vacío en {path}: {row_id} → {column_id}."
                )
            try:
                parsed.append(Decimal(raw_value))
            except InvalidOperation as exc:
                raise MatrixValidationError(
                    f"Valor no numérico en {path}: {row_id} → {column_id} = {raw_value!r}."
                ) from exc
        values.append(tuple(parsed))

    if tuple(row_ids) != column_ids:
        raise MatrixValidationError(
            f"Los IDs y el orden de las filas de {path} no coinciden con sus columnas."
        )
    return DirectedMatrix(
        name=name,
        unit=unit,
        node_ids=column_ids,
        values=tuple(values),
        source_path=path.as_posix(),
        sha256=actual_hash,
    )

