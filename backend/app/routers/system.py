"""Console-only endpoints that look across the whole site: dashboard numbers, the activity log,
backup and restore, and image uploads."""

from collections import Counter
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from .. import audit
from ..db import get_db
from ..models import Activity, AdminUser, Batch, Enquiry, Media, Program, SiteSettings, Testimonial, utcnow
from ..page import load_page, replace_page
from ..schemas import (
    ActivityOut, BackupIn, BatchOut, EnquiryOut, ProgramOut, SettingsOut, TestimonialOut,
)
from ..security import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])

IST = timezone(timedelta(hours=5, minutes=30))  # India has no daylight saving
DAYS = 14


def _ist_day(dt: datetime) -> date:
    if dt.tzinfo is None:  # SQLite hands back naive datetimes; they were stored as UTC
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST).date()


# ---------- Dashboard ----------

@router.get("/stats")
def stats(user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    today = _ist_day(utcnow())
    first_day = today - timedelta(days=DAYS - 1)

    by_status = {s: 0 for s in ("new", "contacted", "enrolled", "closed")}
    by_status.update({s: n for s, n in db.execute(select(Enquiry.status, func.count()).group_by(Enquiry.status))})
    total = sum(by_status.values())

    # Compared in UTC: SQLite stores the wall-clock digits it is given and ignores the offset.
    since = datetime.combine(first_day, datetime.min.time(), tzinfo=IST).astimezone(timezone.utc)
    per_day: Counter[date] = Counter(
        _ist_day(created) for created in db.scalars(select(Enquiry.created_at).where(Enquiry.created_at >= since))
    )
    daily = [
        {"date": (first_day + timedelta(days=i)).isoformat(), "count": per_day[first_day + timedelta(days=i)]}
        for i in range(DAYS)
    ]
    this_week = sum(d["count"] for d in daily[-7:])
    last_week = sum(d["count"] for d in daily[:7])

    def breakdown(column) -> list[dict]:
        rows = db.execute(select(column, func.count()).group_by(column).order_by(func.count().desc())).all()
        return [{"label": label or "Not given", "count": n} for label, n in rows]

    settings = db.scalar(select(SiteSettings).limit(1))
    reviews_live = db.scalar(select(func.count()).select_from(Testimonial).where(Testimonial.published.is_(True))) or 0
    batches_live = db.scalar(select(func.count()).select_from(Batch).where(Batch.active.is_(True))) or 0
    page = load_page(db)

    # Things still at their starter values. `to` is the console page that fixes it.
    checklist = [
        {"label": "Change the starter password", "done": not user.starter_password, "to": "account"},
        {"label": "Add the centre’s phone number", "done": bool(settings) and "00000" not in settings.phone, "to": "contact"},
        {"label": "Add the street address", "done": bool(settings) and not settings.address.lower().startswith("street address"), "to": "contact"},
        {"label": "Add a WhatsApp number", "done": bool(settings and settings.whatsapp), "to": "contact"},
        {"label": "Write the teacher’s bio", "done": bool(settings) and "Replace this" not in settings.mentor_bio, "to": "teacher"},
        {"label": "Upload the teacher’s photo", "done": bool(settings and settings.mentor_photo_url), "to": "teacher"},
        {"label": "Publish at least one student review", "done": reviews_live > 0, "to": "testimonials"},
        {"label": "Show at least one batch", "done": batches_live > 0, "to": "batches"},
    ]

    recent = db.scalars(select(Enquiry).order_by(Enquiry.created_at.desc(), Enquiry.id.desc()).limit(5)).all()

    return {
        "enquiries": {
            **by_status,
            "total": total,
            "today": per_day[today],
            "this_week": this_week,
            "last_week": last_week,
            # Share of enquiries that became students.
            "enrolled_rate": round(100 * by_status["enrolled"] / total) if total else None,
        },
        "daily": daily,
        "by_target": breakdown(Enquiry.target),
        "by_class": breakdown(Enquiry.student_class),
        "content": {
            "programs": db.scalar(select(func.count()).select_from(Program)) or 0,
            "batches": db.scalar(select(func.count()).select_from(Batch)) or 0,
            "batches_live": batches_live,
            "reviews": db.scalar(select(func.count()).select_from(Testimonial)) or 0,
            "reviews_live": reviews_live,
        },
        "site": {
            "maintenance": page.status.maintenance,
            "form_enabled": page.form.enabled,
            "announcement": page.announcement.enabled and bool(page.announcement.text.strip()),
        },
        "checklist": checklist,
        "recent": [EnquiryOut.model_validate(e).model_dump(mode="json") for e in recent],
    }


# ---------- Activity log ----------

@router.get("/activity", response_model=list[ActivityOut])
def activity(limit: int = Query(200, ge=1, le=1000), db: Session = Depends(get_db)):
    return db.scalars(select(Activity).order_by(Activity.id.desc()).limit(limit)).all()


# ---------- Backup & restore ----------

@router.get("/backup")
def backup(user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    settings = db.scalar(select(SiteSettings).limit(1))
    data = {
        "kind": "physics-bkumar-backup",
        "version": 1,
        "exported_at": utcnow().isoformat(),
        "settings": SettingsOut.model_validate(settings).model_dump(mode="json") if settings else None,
        "page": load_page(db).model_dump(mode="json"),
        "programs": [ProgramOut.model_validate(p).model_dump(mode="json")
                     for p in db.scalars(select(Program).order_by(Program.sort_order, Program.id))],
        "batches": [BatchOut.model_validate(b).model_dump(mode="json")
                    for b in db.scalars(select(Batch).order_by(Batch.sort_order, Batch.starts_on, Batch.id))],
        "testimonials": [TestimonialOut.model_validate(t).model_dump(mode="json")
                         for t in db.scalars(select(Testimonial).order_by(Testimonial.sort_order, Testimonial.id))],
        "enquiries": [EnquiryOut.model_validate(e).model_dump(mode="json")
                      for e in db.scalars(select(Enquiry).order_by(Enquiry.id))],
    }
    audit.record(db, user, "backup.download", "Full backup downloaded")
    db.commit()
    return data


@router.post("/restore")
def restore(
    payload: BackupIn,
    include_enquiries: bool = Query(False),
    user: AdminUser = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """Replace the site's content with a backup file. All or nothing: one transaction."""
    done: list[str] = []
    if payload.settings is not None:
        obj = db.scalar(select(SiteSettings).limit(1))
        if obj is None:
            obj = SiteSettings(id=1)
            db.add(obj)
        for key, value in payload.settings.model_dump().items():
            setattr(obj, key, value)
        done.append("site details")
    if payload.page is not None:
        replace_page(db, payload.page)
        done.append("page copy")
    for name, model, rows in (
        ("programs", Program, payload.programs),
        ("batches", Batch, payload.batches),
        ("reviews", Testimonial, payload.testimonials),
    ):
        if rows is None:
            continue
        db.execute(delete(model))
        db.add_all(model(**row.model_dump()) for row in rows)
        done.append(f"{len(rows)} {name}")
    if include_enquiries and payload.enquiries is not None:
        db.execute(delete(Enquiry))
        for row in payload.enquiries:
            fields = row.model_dump()
            fields["created_at"] = fields["created_at"] or utcnow()
            fields["updated_at"] = fields["updated_at"] or fields["created_at"]
            db.add(Enquiry(**fields))
        done.append(f"{len(payload.enquiries)} enquiries")
    if not done:
        raise HTTPException(422, "That file has nothing to restore.")
    audit.record(db, user, "backup.restore", "Restored from backup: " + ", ".join(done))
    db.commit()
    return {"ok": True, "restored": done}


# ---------- Image upload ----------

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 1_500_000


@router.post("/media", status_code=201)
async def upload_media(
    request: Request,
    filename: str = Query("image", max_length=160),
    user: AdminUser = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    """The request body is the image itself; Content-Type says which kind."""
    content_type = (request.headers.get("content-type") or "").split(";")[0].strip().lower()
    if content_type not in IMAGE_TYPES:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Upload a JPEG, PNG or WebP image.")
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "That image is too large. Keep it under 1.5 MB.")
    data = b""
    async for chunk in request.stream():
        data += chunk
        if len(data) > MAX_IMAGE_BYTES:
            raise HTTPException(413, "That image is too large. Keep it under 1.5 MB.")
    if not data:
        raise HTTPException(422, "The image was empty.")
    obj = Media(filename=filename, content_type=content_type, data=data)
    db.add(obj)
    audit.record(db, user, "media.upload", f"Image “{filename}” uploaded")
    db.commit()
    db.refresh(obj)
    return {"id": obj.id, "url": f"/api/media/{obj.id}"}
