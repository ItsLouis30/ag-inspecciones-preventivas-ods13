"""Matriz dirigida, inmutable y subseleccionable por identificadores."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from .errors import MatrixValidationError


@dataclass(frozen=True, slots=True)
class DirectedMatrix:
    name: str
    unit: str
    node_ids: tuple[str, ...]
    values: tuple[tuple[Decimal, ...], ...]
    source_path: str = ""
    sha256: str = ""

    def __post_init__(self) -> None:
        size = len(self.node_ids)
        if size == 0:
            raise MatrixValidationError(f"La matriz {self.name} no contiene nodos.")
        if len(set(self.node_ids)) != size:
            raise MatrixValidationError(f"La matriz {self.name} contiene IDs duplicados.")
        if len(self.values) != size or any(len(row) != size for row in self.values):
            raise MatrixValidationError(
                f"La matriz {self.name} debe ser cuadrada: nodos={size}, filas={len(self.values)}."
            )
        for row_index, row in enumerate(self.values):
            for column_index, value in enumerate(row):
                if not value.is_finite():
                    raise MatrixValidationError(
                        f"{self.name}[{self.node_ids[row_index]},{self.node_ids[column_index]}] no es finito."
                    )
                if value < 0:
                    raise MatrixValidationError(
                        f"{self.name}[{self.node_ids[row_index]},{self.node_ids[column_index]}] es negativo."
                    )
                if row_index == column_index and value != 0:
                    raise MatrixValidationError(
                        f"La diagonal de {self.name} debe ser cero en {self.node_ids[row_index]}."
                    )

    def index(self, node_id: str) -> int:
        try:
            return self.node_ids.index(node_id)
        except ValueError as exc:
            raise MatrixValidationError(f"{node_id!r} no pertenece a la matriz {self.name}.") from exc

    def cost(self, origin_id: str, destination_id: str) -> Decimal:
        return self.values[self.index(origin_id)][self.index(destination_id)]

    def submatrix(self, selected_node_ids: tuple[str, ...]) -> "DirectedMatrix":
        if not selected_node_ids:
            raise MatrixValidationError("Una submatriz debe conservar al menos el origen.")
        if len(selected_node_ids) != len(set(selected_node_ids)):
            raise MatrixValidationError("La subselección contiene IDs duplicados.")
        indices = tuple(self.index(node_id) for node_id in selected_node_ids)
        selected_values = tuple(tuple(self.values[i][j] for j in indices) for i in indices)
        return DirectedMatrix(
            name=self.name,
            unit=self.unit,
            node_ids=selected_node_ids,
            values=selected_values,
            source_path=self.source_path,
            sha256=self.sha256,
        )

    @property
    def is_asymmetric(self) -> bool:
        return any(
            self.values[i][j] != self.values[j][i]
            for i in range(len(self.node_ids))
            for j in range(i + 1, len(self.node_ids))
        )

