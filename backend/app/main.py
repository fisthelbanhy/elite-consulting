"""Application FastAPI de La Frangine. Toutes les routes sont préfixées par /api."""

import logging

from fastapi import APIRouter, FastAPI
from fastapi.staticfiles import StaticFiles

from app import erreurs
from app.config import get_settings
from app.routers import MODULES

settings = get_settings()
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="La Frangine — API",
    version="1.0.0",
    description="API interne consommée par le frontend SvelteKit (architecture BFF, ADR-0002).",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)
erreurs.installer(app)

api = APIRouter(prefix="/api")
for module in MODULES:
    for r in module:
        api.include_router(r)


@api.get("/sante", tags=["Système"])
def sante() -> dict:
    return {"statut": "ok"}


app.include_router(api)

settings.media_dir.mkdir(parents=True, exist_ok=True)
app.mount(settings.media_url, StaticFiles(directory=settings.media_dir), name="media")
