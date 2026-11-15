from __future__ import annotations

import shutil
from pathlib import Path

import pytest

from app.geography.dataset_loader import DEFAULT_MANIFEST_PATH, load_manifest, load_reference_dataset


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SYNTHETIC_FIXTURE = Path(__file__).parent / "fixtures" / "synthetic_5" / "instance.json"


@pytest.fixture(scope="session")
def project_root() -> Path:
    return PROJECT_ROOT


@pytest.fixture(scope="session")
def reference_dataset(project_root: Path):
    return load_reference_dataset(project_root)


@pytest.fixture(scope="session")
def synthetic_fixture() -> Path:
    return SYNTHETIC_FIXTURE


@pytest.fixture
def copied_project(tmp_path: Path, project_root: Path) -> Path:
    manifest = load_manifest(DEFAULT_MANIFEST_PATH)
    for file in manifest.files:
        source = project_root / file.relative_path
        destination = tmp_path / file.relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
    return tmp_path

