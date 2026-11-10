import csv
import io
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import Base, get_db
from ..models import Batch, Enquiry, Program, SiteSettings, Testimonial
from ..schemas import (
    BatchIn, BatchOut, BatchPatch, EnquiryOut, EnquiryPatch, EnquiryStatus, LoginIn,
    ProgramIn, ProgramOut, ProgramPatch, SettingsIn, SettingsOut, TestimonialIn,
    TestimonialOut, TestimonialPatch, TokenOut,
)
from ..security import check_password, client_ip, create_token, limiter, require_admin

auth_router = APIRouter(prefix="/api/admin", tags=["admin"])
router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


# ---------- Auth ----------

@auth_router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, request: Request):
    cfg = get_settings()
    if not limiter.hit(f"login:{client_ip(request)}", cfg.login_limit, cfg.rate_window_seconds):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts. Wait a few minutes and try again.")
    if not check_password(payload.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "That password is not correct.")
    token, exp = create_token()
    return TokenOut(token=token, expires_at=exp)


@router.get("/me")
def me() -> dict:
    return {"ok": True}


# ---------- Generic CRUD for simple content tables ----------

def _crud(path: str, model: type[Base], schema_in: type[BaseModel], schema_patch: type[BaseModel],
          schema_out: type[BaseModel], order_by: list[Any]) -> None:
    def get_or_404(db: Session, item_id: int):
        obj = db.get(model, item_id)
        if obj is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found.")
        return obj

    def list_items(db: Session = Depends(get_db)):
        return db.scalars(select(model).order_by(*order_by)).all()

    def create_item(payload: schema_in, db: Session = Depends(get_db)):  # type: ignore[valid-type]
        obj = model(**payload.model_dump())
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def update_item(item_id: int, payload: schema_patch, db: Session = Depends(get_db)):  # type: ignore[valid-type]
        obj = get_or_404(db, item_id)
        for key, value in payload.model_dump(exclude_unset=True).items():
            if value is None:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"'{key}' cannot be empty.")
            setattr(obj, key, value)
        db.commit()
        db.refresh(obj)
        return obj

    def delete_item(item_id: int, db: Session = Depends(get_db)):
        db.delete(get_or_404(db, item_id))
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    router.add_api_route(path, list_items, methods=["GET"], response_model=list[schema_out])
    router.add_api_route(path, create_item, methods=["POST"], response_model=schema_out, status_code=201)
    router.add_api_route(f"{path}/{{item_id}}", update_item, methods=["PATCH"], response_model=schema_out)
    router.add_api_route(f"{path}/{{item_id}}", delete_item, methods=["DELETE"], status_code=204)


_crud("/programs", Program, ProgramIn, ProgramPatch, ProgramOut, [Program.sort_order, Program.id])
_crud("/batches", Batch, BatchIn, BatchPatch, BatchOut, [Batch.sort_order, Batch.starts_on])
_crud("/testimonials", Testimonial, TestimonialIn, TestimonialPatch, TestimonialOut,
      [Testimonial.sort_order, Testimonial.id])


# ---------- Site settings ----------

@router.get("/settings", response_model=SettingsOut)
def get_site_settings(db: Session = Depends(get_db)):
    obj = db.scalar(select(SiteSettings).limit(1))
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Site settings are missing.")
    return obj


@router.put("/settings", response_model=SettingsOut)
def put_site_settings(payload: SettingsIn, db: Session = Depends(get_db)):
    obj = db.scalar(select(SiteSettings).limit(1))
    if obj is None:
        obj = SiteSettings(id=1)
        db.add(obj)
    for key, value in payload.model_dump().items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


# ---------- Enquiries ----------

@router.get("/enquiries", response_model=list[EnquiryOut])
def list_enquiries(status_: EnquiryStatus | None = Query(None, alias="status"), db: Session = Depends(get_db)):
    q = select(Enquiry).order_by(Enquiry.created_at.desc(), Enquiry.id.desc())
    if status_:
        q = q.where(Enquiry.status == status_)
    return db.scalars(q).all()


@router.get("/enquiries/summary")
def enquiry_summary(db: Session = Depends(get_db)) -> dict[str, int]:
    rows = db.execute(select(Enquiry.status, func.count()).group_by(Enquiry.status)).all()
    counts = {s: 0 for s in ("new", "contacted", "enrolled", "closed")}
    counts.update({s: n for s, n in rows})
    return counts


@router.get("/enquiries/export.csv")
def export_enquiries(db: Session = Depends(get_db)):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["id", "created_at", "name", "phone", "class", "target", "message", "status", "notes"])
    for e in db.scalars(select(Enquiry).order_by(Enquiry.created_at.desc())):
        w.writerow([e.id, e.created_at.isoformat(), e.name, e.phone, e.student_class, e.target, e.message, e.status, e.notes])
    return Response(
        buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="enquiries.csv"'},
    )


@router.patch("/enquiries/{item_id}", response_model=EnquiryOut)
def update_enquiry(item_id: int, payload: EnquiryPatch, db: Session = Depends(get_db)):
    obj = db.get(Enquiry, item_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enquiry not found.")
    for key, value in payload.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/enquiries/{item_id}", status_code=204)
def delete_enquiry(item_id: int, db: Session = Depends(get_db)):
    obj = db.get(Enquiry, item_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enquiry not found.")
    db.delete(obj)
    db.commit()
    return Response(status_code=204)
