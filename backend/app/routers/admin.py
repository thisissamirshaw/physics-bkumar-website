import csv
import io
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.orm import Session

from .. import audit
from ..config import get_settings
from ..db import Base, get_db
from ..models import AdminUser, Batch, Enquiry, Media, Program, SiteSettings, Testimonial, utcnow
from ..page import BLOCK_LABELS, PageContent, PagePatch, load_page, save_page
from ..schemas import (
    AccountOut, AdminEnquiryIn, BatchIn, BatchOut, BatchPatch, EmailChange, EnquiryBulk, EnquiryOut,
    EnquiryPatch, EnquiryStatus, LoginIn, PasswordChange, ProgramIn, ProgramOut, ProgramPatch,
    ReorderIn, SettingsIn, SettingsOut, TestimonialIn, TestimonialOut, TestimonialPatch, TokenOut,
)
from ..security import check_login, client_ip, create_token, hash_password, limiter, require_admin

auth_router = APIRouter(prefix="/api/admin", tags=["admin"])
router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _account(user: AdminUser) -> AccountOut:
    return AccountOut(email=user.email, starter_password=user.starter_password, last_login_at=user.last_login_at)


def _token(user: AdminUser) -> TokenOut:
    token, exp = create_token(user)
    return TokenOut(token=token, expires_at=exp, account=_account(user))


# ---------- Sign-in & account ----------

@auth_router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, request: Request, db: Session = Depends(get_db)):
    cfg = get_settings()
    ip = client_ip(request)
    if not limiter.hit(f"login:{ip}", cfg.login_limit, cfg.rate_window_seconds):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts. Wait a few minutes and try again.")
    user = db.scalar(select(AdminUser).where(AdminUser.email == payload.email))
    if not check_login(user, payload.password):
        audit.record(db, payload.email or "unknown", "login.failed", f"Wrong email or password, from {ip}")
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "That email or password is not correct.")
    out = _token(user)  # reports the previous sign-in time
    user.last_login_at = utcnow()
    audit.record(db, user, "login", f"Signed in from {ip}")
    audit.prune(db)
    db.commit()
    return out


@router.get("/me", response_model=AccountOut)
def me(user: AdminUser = Depends(require_admin)):
    return _account(user)


@router.put("/account/email", response_model=AccountOut)
def change_email(payload: EmailChange, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    if not check_login(user, payload.current_password):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Current password is not correct.")
    old = user.email
    user.email = payload.email
    audit.record(db, user, "account.email", f"Sign-in email changed from {old}")
    db.commit()
    return _account(user)


@router.put("/account/password", response_model=TokenOut)
def change_password(payload: PasswordChange, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    if not check_login(user, payload.current_password):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Current password is not correct.")
    if payload.new_password == payload.current_password:
        raise HTTPException(422, "Choose a password different from the current one.")
    user.password_hash = hash_password(payload.new_password)
    user.starter_password = False
    user.token_version += 1  # every other session is signed out
    audit.record(db, user, "account.password", "Password changed; other sessions signed out")
    db.commit()
    return _token(user)


@router.post("/account/signout-all", response_model=TokenOut)
def sign_out_everywhere(user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    user.token_version += 1
    audit.record(db, user, "account.sessions", "Signed out every other session")
    db.commit()
    return _token(user)


# ---------- Generic CRUD for the content tables ----------

def _crud(path: str, model: type[Base], schema_in: type[BaseModel], schema_patch: type[BaseModel],
          schema_out: type[BaseModel], order_by: list[Any], noun: str, name_attr: str) -> None:
    def get_or_404(db: Session, item_id: int):
        obj = db.get(model, item_id)
        if obj is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found.")
        return obj

    def label(obj) -> str:
        return f"{noun.capitalize()} “{getattr(obj, name_attr)}”"

    def list_items(db: Session = Depends(get_db)):
        return db.scalars(select(model).order_by(*order_by)).all()

    def create_item(payload: schema_in, user: AdminUser = Depends(require_admin),  # type: ignore[valid-type]
                    db: Session = Depends(get_db)):
        obj = model(**payload.model_dump())
        if not obj.sort_order:  # new items go to the end
            obj.sort_order = (db.scalar(select(func.max(model.sort_order))) or 0) + 1
        db.add(obj)
        audit.record(db, user, f"{noun}.create", f"{label(obj)} added")
        db.commit()
        db.refresh(obj)
        return obj

    def update_item(item_id: int, payload: schema_patch, user: AdminUser = Depends(require_admin),  # type: ignore[valid-type]
                    db: Session = Depends(get_db)):
        obj = get_or_404(db, item_id)
        changes = payload.model_dump(exclude_unset=True)
        for key, value in changes.items():
            if value is None:
                raise HTTPException(422, f"'{key}' cannot be empty.")
            setattr(obj, key, value)
        audit.record(db, user, f"{noun}.update", f"{label(obj)} edited")
        db.commit()
        db.refresh(obj)
        return obj

    def delete_item(item_id: int, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
        obj = get_or_404(db, item_id)
        audit.record(db, user, f"{noun}.delete", f"{label(obj)} deleted")
        db.delete(obj)
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    def reorder_items(payload: ReorderIn, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
        """Set the order on the page to the order of the ids given."""
        rows = {obj.id: obj for obj in db.scalars(select(model))}
        position = 0
        for item_id in payload.ids:
            if item_id in rows:
                position += 1
                rows.pop(item_id).sort_order = position
        for obj in sorted(rows.values(), key=lambda o: (o.sort_order, o.id)):  # ids not mentioned keep their order, after
            position += 1
            obj.sort_order = position
        audit.record(db, user, f"{noun}.reorder", f"{noun.capitalize()} order changed")
        db.commit()
        return db.scalars(select(model).order_by(*order_by)).all()

    router.add_api_route(path, list_items, methods=["GET"], response_model=list[schema_out])
    router.add_api_route(path, create_item, methods=["POST"], response_model=schema_out, status_code=201)
    router.add_api_route(f"{path}/reorder", reorder_items, methods=["POST"], response_model=list[schema_out])
    router.add_api_route(f"{path}/{{item_id}}", update_item, methods=["PATCH"], response_model=schema_out)
    router.add_api_route(f"{path}/{{item_id}}", delete_item, methods=["DELETE"], status_code=204)


_crud("/programs", Program, ProgramIn, ProgramPatch, ProgramOut, [Program.sort_order, Program.id], "program", "title")
_crud("/batches", Batch, BatchIn, BatchPatch, BatchOut, [Batch.sort_order, Batch.starts_on, Batch.id], "batch", "name")
_crud("/testimonials", Testimonial, TestimonialIn, TestimonialPatch, TestimonialOut,
      [Testimonial.sort_order, Testimonial.id], "review", "student_name")


# ---------- Site settings (contact details, teacher, facts) ----------

@router.get("/settings", response_model=SettingsOut)
def get_site_settings(db: Session = Depends(get_db)):
    obj = db.scalar(select(SiteSettings).limit(1))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Site settings are missing.")
    return obj


@router.put("/settings", response_model=SettingsOut)
def put_site_settings(payload: SettingsIn, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    obj = db.scalar(select(SiteSettings).limit(1))
    if obj is None:
        obj = SiteSettings(id=1)
        db.add(obj)
    changed = [k for k, v in payload.model_dump().items() if getattr(obj, k, None) != v]
    for key, value in payload.model_dump().items():
        setattr(obj, key, value)
    # Uploaded photos that are no longer used anywhere are dropped.
    keep = obj.mentor_photo_url.rsplit("/", 1)[-1] if obj.mentor_photo_url.startswith("/api/media/") else ""
    db.execute(delete(Media).where(Media.id != int(keep)) if keep.isdigit() else delete(Media))
    if changed:
        audit.record(db, user, "settings.update", "Site details edited: " + ", ".join(c.replace("_", " ") for c in changed))
    db.commit()
    db.refresh(obj)
    return obj


# ---------- Page copy (hero, headings, method, syllabus, form, branding, SEO, status) ----------

@router.get("/page", response_model=PageContent)
def get_page(db: Session = Depends(get_db)):
    return load_page(db)


@router.put("/page", response_model=PageContent)
def put_page(payload: PagePatch, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    written = save_page(db, payload)
    if written:
        audit.record(db, user, "page.update", "Edited: " + ", ".join(BLOCK_LABELS.get(k, k) for k in written))
    db.commit()
    return load_page(db)


# ---------- Enquiries ----------

def _csv_safe(value: str) -> str:
    """Stop a spreadsheet from running a cell that a visitor typed as a formula."""
    return "'" + value if value[:1] in ("=", "+", "-", "@") else value


@router.get("/enquiries", response_model=list[EnquiryOut])
def list_enquiries(
    status_: EnquiryStatus | None = Query(None, alias="status"),
    q: str = Query("", max_length=80),
    db: Session = Depends(get_db),
):
    stmt = select(Enquiry).order_by(Enquiry.created_at.desc(), Enquiry.id.desc())
    if status_:
        stmt = stmt.where(Enquiry.status == status_)
    term = q.strip().lower()
    if term:
        like = f"%{term}%"
        stmt = stmt.where(or_(
            func.lower(Enquiry.name).like(like), Enquiry.phone.like(like), func.lower(Enquiry.message).like(like),
            func.lower(Enquiry.notes).like(like), func.lower(Enquiry.target).like(like),
            func.lower(Enquiry.student_class).like(like),
        ))
    return db.scalars(stmt).all()


@router.post("/enquiries", response_model=EnquiryOut, status_code=201)
def add_enquiry(payload: AdminEnquiryIn, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    obj = Enquiry(**payload.model_dump())
    obj.name = " ".join(obj.name.split())
    db.add(obj)
    audit.record(db, user, "enquiry.create", f"Enquiry from {obj.name} added by hand")
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/enquiries/summary")
def enquiry_summary(db: Session = Depends(get_db)) -> dict[str, int]:
    rows = db.execute(select(Enquiry.status, func.count()).group_by(Enquiry.status)).all()
    counts = {s: 0 for s in ("new", "contacted", "enrolled", "closed")}
    counts.update({s: n for s, n in rows})
    return counts


@router.get("/enquiries/export.csv")
def export_enquiries(user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["id", "created_at", "name", "phone", "class", "target", "message", "status", "notes"])
    for e in db.scalars(select(Enquiry).order_by(Enquiry.created_at.desc())):
        w.writerow([e.id, e.created_at.isoformat(), _csv_safe(e.name), e.phone, _csv_safe(e.student_class),
                    _csv_safe(e.target), _csv_safe(e.message), e.status, _csv_safe(e.notes)])
    audit.record(db, user, "enquiry.export", "Enquiries exported to CSV")
    db.commit()
    return Response(
        "﻿" + buf.getvalue(),  # BOM so Excel reads names in Hindi and other scripts correctly
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="enquiries.csv"'},
    )


@router.post("/enquiries/bulk")
def bulk_enquiries(payload: EnquiryBulk, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    if payload.action == "status":
        if payload.status is None:
            raise HTTPException(422, "Choose a status.")
        n = db.execute(
            update(Enquiry).where(Enquiry.id.in_(payload.ids)).values(status=payload.status, updated_at=utcnow())
        ).rowcount
        audit.record(db, user, "enquiry.bulk", f"{n} enquiries marked {payload.status}")
    else:
        n = db.execute(delete(Enquiry).where(Enquiry.id.in_(payload.ids))).rowcount
        audit.record(db, user, "enquiry.bulk", f"{n} enquiries deleted")
    db.commit()
    return {"ok": True, "count": n}


@router.patch("/enquiries/{item_id}", response_model=EnquiryOut)
def update_enquiry(item_id: int, payload: EnquiryPatch, user: AdminUser = Depends(require_admin),
                   db: Session = Depends(get_db)):
    obj = db.get(Enquiry, item_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enquiry not found.")
    changes = payload.model_dump(exclude_unset=True, exclude_none=True)
    for key, value in changes.items():
        setattr(obj, key, value)
    if "status" in changes:
        audit.record(db, user, "enquiry.status", f"{obj.name} marked {obj.status}")
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/enquiries/{item_id}", status_code=204)
def delete_enquiry(item_id: int, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    obj = db.get(Enquiry, item_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enquiry not found.")
    audit.record(db, user, "enquiry.delete", f"Enquiry from {obj.name} deleted")
    db.delete(obj)
    db.commit()
    return Response(status_code=204)
