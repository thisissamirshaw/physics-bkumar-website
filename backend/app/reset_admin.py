"""Locked out? Run from the backend folder:

    .venv/bin/python -m app.reset_admin

It puts the super admin back to SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD (from backend/.env, or the
built-in starter values) and signs out every open session. Nothing else is touched.
"""

from .db import Base, SessionLocal, engine
from .seed import ensure_superadmin


def main() -> None:
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        user = ensure_superadmin(db, reset=True)
    print(f"Super admin reset. Sign in as {user.email} with the configured password.")


if __name__ == "__main__":
    main()
