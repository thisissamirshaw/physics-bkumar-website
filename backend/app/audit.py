"""Activity log: one short line for everything done in the console."""

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from .models import Activity, AdminUser

KEEP = 1000  # newest rows kept


def record(db: Session, actor: AdminUser | str, action: str, detail: str = "") -> None:
    """Queue a log line. The caller commits it together with the change it describes."""
    email = actor if isinstance(actor, str) else actor.email
    db.add(Activity(actor=email[:160], action=action, detail=detail[:300]))


def prune(db: Session) -> None:
    newest = db.scalar(select(func.max(Activity.id)))
    if newest and newest > KEEP:
        db.execute(delete(Activity).where(Activity.id <= newest - KEEP))
