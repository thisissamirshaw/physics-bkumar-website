import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .db import Base, SessionLocal, engine
from .routers import admin, public
from .seed import seed

log = logging.getLogger("physics")


@asynccontextmanager
async def lifespan(_: FastAPI):
    cfg = get_settings()
    problems = cfg.check()
    if problems:
        if cfg.app_env == "production":
            raise RuntimeError("Refusing to start in production: " + "; ".join(problems))
        for p in problems:
            log.warning("%s. Set it in backend/.env before going live.", p)

    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
    yield


cfg = get_settings()
app = FastAPI(
    title="Physics by B. Kumar API",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cfg.cors_origins,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(public.router)
app.include_router(admin.auth_router)
app.include_router(admin.router)


# Serve the built React app (frontend/dist) from the same server in production.
dist: Path = cfg.frontend_dist
if (dist / "index.html").exists():
    if (dist / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(404, "Not found")
        candidate = (dist / full_path).resolve()
        if full_path and candidate.is_file() and dist.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(dist / "index.html")
