from decimal import Decimal
from pathlib import Path

import pytest

from app.domain.errors import MatrixValidationError, SchemaValidationError
from app.domain.matrix import DirectedMatrix
from app.geography.matrix_loader import load_matrix_csv


def test_directed_matrix_detects_asymmetry_and_subselects() -> None:
    matrix = DirectedMatrix(
        name="test",
        unit="km",
        node_ids=("ORIGEN", "A", "B"),
        values=(
            (Decimal("0"), Decimal("1"), Decimal("4")),
            (Decimal("2"), Decimal("0"), Decimal("3")),
            (Decimal("5"), Decimal("6"), Decimal("0")),
        ),
    )
    assert matrix.is_asymmetric
    assert matrix.cost("ORIGEN", "A") == Decimal("1")
    assert matrix.cost("A", "ORIGEN") == Decimal("2")
    subset = matrix.submatrix(("ORIGEN", "B"))
    assert subset.node_ids == ("ORIGEN", "B")
    assert subset.values == ((Decimal("0"), Decimal("4")), (Decimal("5"), Decimal("0")))


@pytest.mark.parametrize(
    "values, message",
    [
        (((Decimal("1"),),), "diagonal"),
        (((Decimal("0"), Decimal("-1")), (Decimal("1"), Decimal("0"))), "negativo"),
        (((Decimal("0"), Decimal("NaN")), (Decimal("1"), Decimal("0"))), "finito"),
    ],
)
def test_matrix_rejects_invalid_values(values, message: str) -> None:
    node_ids = ("ORIGEN",) if len(values) == 1 else ("ORIGEN", "A")
    with pytest.raises(MatrixValidationError, match=message):
        DirectedMatrix(name="invalid", unit="km", node_ids=node_ids, values=values)


def test_matrix_csv_rejects_row_column_mismatch(tmp_path: Path) -> None:
    path = tmp_path / "matrix.csv"
    path.write_text("origin_destination,ORIGEN,A\nA,0,1\nORIGEN,2,0\n", encoding="utf-8")
    with pytest.raises(MatrixValidationError, match="no coinciden"):
        load_matrix_csv(path, name="invalid", unit="km")


def test_matrix_csv_rejects_disconnected_arc(tmp_path: Path) -> None:
    path = tmp_path / "matrix.csv"
    path.write_text("origin_destination,ORIGEN,A\nORIGEN,0,\nA,2,0\n", encoding="utf-8")
    with pytest.raises(MatrixValidationError, match="desconectado"):
        load_matrix_csv(path, name="invalid", unit="km")


def test_matrix_csv_requires_expected_header(tmp_path: Path) -> None:
    path = tmp_path / "matrix.csv"
    path.write_text("node,ORIGEN\nORIGEN,0\n", encoding="utf-8")
    with pytest.raises(SchemaValidationError, match="origin_destination"):
        load_matrix_csv(path, name="invalid", unit="km")

