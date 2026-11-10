from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings

_url = get_settings().database_url
# Hosted Postgres (Neon, Render, ...) hands out "postgres://" or "postgresql://" URLs;
# SQLAlchemy needs the driver named to use psycopg 3.
for _prefix in ("postgres://", "postgresql://"):
    if _url.startswith(_prefix):
        _url = "postgresql+psycopg://" + _url[len(_prefix):]
        break

if _url.startswith("sqlite"):
    engine = create_engine(_url, connect_args={"check_same_thread": False})
else:
    # pool_pre_ping: serverless Postgres closes idle connections; reconnect instead of erroring.
    engine = create_engine(_url, pool_pre_ping=True, pool_recycle=300)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
