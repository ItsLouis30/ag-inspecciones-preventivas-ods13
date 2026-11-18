from __future__ import annotations

import tracemalloc
from time import perf_counter

import pytest

from app.genetic_algorithm import EvolutionConfig, run_genetic_algorithm
from app.geography import build_expanded, load_territory_catalog


@pytest.mark.parametrize("territory_id", ["srq_extended", "union_43"])
def test_ga_scalability_profile_stays_within_render_free_guardrails(
    territory_id, project_root, reference_dataset
) -> None:
    """Perfil acotado: no pretende sustituir una prueba de carga del proveedor."""

    catalog = load_territory_catalog(project_root, reference_dataset)
    scenario = build_expanded(catalog.get(territory_id).dataset)
    config = EvolutionConfig(
        population_size=40,
        elite_count=2,
        max_generations=30,
        max_evaluations=1_200,
        stagnation_generations=20,
        seed=11,
    )
    tracemalloc.start()
    started = perf_counter()
    result = run_genetic_algorithm(scenario, config)
    runtime_s = perf_counter() - started
    _, peak_bytes = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    assert result.evaluation.feasible is True
    assert runtime_s < 30
    assert peak_bytes < 256 * 1024 * 1024
