"""Arranque local seguro del servidor académico."""

import uvicorn

from app.core.settings import load_api_settings


def main() -> None:
    settings = load_api_settings()
    uvicorn.run("app.main:app", host=settings.host, port=settings.port)


if __name__ == "__main__":
    main()
