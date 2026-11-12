import logging
import re
from contextlib import asynccontextmanager
from html import escape
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from .config import DEFAULT_SUPERADMIN_PASSWORD, get_settings
from .db import Base, SessionLocal, engine, get_db
from .routers import admin, public, system
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
    if cfg.superadmin_password == DEFAULT_SUPERADMIN_PASSWORD:
        log.warning("The super admin starts with the built-in password. Change it in the console: Account & security.")

    Base.metadata.create_all(engine)  # also adds tables that are new in this version
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
app.include_router(system.router)


# Serve the built React app (frontend/dist) from the same server in production.
dist: Path = cfg.frontend_dist


def render_index(db: Session) -> str:
    """index.html with the site's content written into it, so the first paint and search engines
    get the real title and text instead of waiting for a second request."""
    html = (dist / "index.html").read_text(encoding="utf-8")
    try:
        data = public.content(db)
    except HTTPException:
        return html
    seo = data.page.seo

    def meta(html: str, attr: str, value: str) -> str:
        return re.sub(
            rf'(<meta {attr} content=")[^"]*(")',
            lambda m: m.group(1) + escape(value, quote=True) + m.group(2),
            html, count=1,
        )

    html = re.sub(r"<title>.*?</title>", lambda _: f"<title>{escape(seo.title)}</title>", html, count=1, flags=re.S)
    html = meta(html, 'name="description"', seo.description)
    html = meta(html, 'property="og:title"', data.settings.centre_name)
    html = meta(html, 'property="og:description"', seo.description)
    # "<" is escaped so nothing typed in the console can close the script tag.
    payload = data.model_dump_json().replace("<", "\\u003c")
    return html.replace("</head>", f'<script id="pbk-content" type="application/json">{payload}</script>\n  </head>', 1)


if (dist / "index.html").exists():
    if (dist / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str, db: Session = Depends(get_db)):
        if full_path.startswith("api/"):
            raise HTTPException(404, "Not found")
        candidate = (dist / full_path).resolve()
        if full_path and candidate.is_file() and dist.resolve() in candidate.parents:
            return FileResponse(candidate)
        if full_path == "admin" or full_path.startswith("admin/"):
            return FileResponse(dist / "index.html", headers={"Cache-Control": "no-cache"})
        return HTMLResponse(render_index(db), headers={"Cache-Control": "no-cache"})
