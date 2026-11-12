from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import Batch, Enquiry, Media, Program, SiteSettings, Testimonial
from ..page import load_page
from ..schemas import Content, EnquiryAck, EnquiryIn
from ..security import client_ip, limiter

router = APIRouter(prefix="/api", tags=["public"])


@router.get("/health")
def health() -> dict:
    return {"ok": True}


@router.get("/content", response_model=Content)
def content(db: Session = Depends(get_db)):
    settings = db.scalar(select(SiteSettings).limit(1))
    if settings is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Site settings are missing.")
    return Content(
        settings=settings,
        programs=db.scalars(select(Program).order_by(Program.sort_order, Program.id)).all(),
        batches=db.scalars(
            select(Batch).where(Batch.active.is_(True)).order_by(Batch.sort_order, Batch.starts_on, Batch.id)
        ).all(),
        testimonials=db.scalars(
            select(Testimonial).where(Testimonial.published.is_(True)).order_by(Testimonial.sort_order, Testimonial.id)
        ).all(),
        page=load_page(db),
    )


@router.get("/media/{media_id}")
def media(media_id: int, db: Session = Depends(get_db)):
    """Images uploaded from the console. An upload never changes, so browsers may keep it."""
    obj = db.get(Media, media_id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found.")
    return Response(
        obj.data,
        media_type=obj.content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff"},
    )


@router.post("/enquiries", response_model=EnquiryAck, status_code=status.HTTP_201_CREATED)
def create_enquiry(payload: EnquiryIn, request: Request, db: Session = Depends(get_db)):
    cfg = get_settings()
    if not limiter.hit(f"enquiry:{client_ip(request)}", cfg.enquiry_limit, cfg.rate_window_seconds):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many requests from this device. Please call us instead, or try again in a few minutes.",
        )

    form = load_page(db).form
    if not form.enabled:
        raise HTTPException(status.HTTP_403_FORBIDDEN, form.closed_text)
    if payload.student_class not in form.classes:
        raise HTTPException(422, "Choose a class from the list.")
    if payload.target not in form.targets:
        raise HTTPException(422, "Choose a target from the list.")

    first_name = payload.name.split()[0]
    ack = EnquiryAck(message=f"Thanks, {first_name}. We'll call you back on {payload.phone} soon.")

    if payload.website:  # honeypot filled: almost certainly a bot, pretend success
        return ack

    db.add(Enquiry(**payload.model_dump(exclude={"website"})))
    db.commit()
    return ack
