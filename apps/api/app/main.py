from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.categories.routes import router as categories_router
from app.core.config import get_settings
from app.desserts.routes import router as desserts_router
from app.inquiries.routes import router as inquiries_router
from app.promotions.routes import router as promotions_router
from app.reviews.routes import router as reviews_router


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Cake & Shape API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_frontend_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    app.include_router(categories_router)
    app.include_router(desserts_router)
    app.include_router(inquiries_router)
    app.include_router(reviews_router)
    app.include_router(promotions_router)
    Path(settings.media_root).mkdir(parents=True, exist_ok=True)
    app.mount("/api/media", StaticFiles(directory=settings.media_root), name="media")
    return app


app = create_app()
