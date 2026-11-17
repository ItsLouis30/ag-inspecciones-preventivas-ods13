from __future__ import annotations

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.frontend import mount_compiled_frontend


pytestmark = pytest.mark.anyio


async def test_compiled_frontend_serves_assets_and_spa_routes(tmp_path) -> None:
    directory = tmp_path / "frontend" / "dist"
    assets = directory / "assets"
    assets.mkdir(parents=True)
    (directory / "index.html").write_text("<main>ODS 13</main>", encoding="utf-8")
    (assets / "app.js").write_text("console.log('ods13')", encoding="utf-8")
    app = FastAPI()

    assert mount_compiled_frontend(app, tmp_path) is True

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        root = await client.get("/")
        react_route = await client.get("/experimentos")
        asset = await client.get("/assets/app.js")
        missing_asset = await client.get("/assets/missing.js")

    assert root.status_code == 200
    assert react_route.status_code == 200
    assert "ODS 13" in react_route.text
    assert asset.status_code == 200
    assert "ods13" in asset.text
    assert missing_asset.status_code == 404


def test_compiled_frontend_is_optional(tmp_path) -> None:
    assert mount_compiled_frontend(FastAPI(), tmp_path) is False
