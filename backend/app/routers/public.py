from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import Batch, Enquiry, Program, SiteSettings, Testimonial
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
            select(Batch).where(Batch.active.is_(True)).order_by(Batch.sort_order, Batch.starts_on)
        ).all(),
        testimonials=db.scalars(
            select(Testimonial).where(Testimonial.published.is_(True)).order_by(Testimonial.sort_order, Testimonial.id)
        ).all(),
    )


@router.post("/enquiries", response_model=EnquiryAck, status_code=status.HTTP_201_CREATED)
def create_enquiry(payload: EnquiryIn, request: Request, db: Session = Depends(get_db)):
    cfg = get_settings()
    if not limiter.hit(f"enquiry:{client_ip(request)}", cfg.enquiry_limit, cfg.rate_window_seconds):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many requests from this device. Please call us instead, or try again in a few minutes.",
        )

    first_name = payload.name.split()[0]
    ack = EnquiryAck(message=f"Thanks, {first_name}. We'll call you back on {payload.phone} soon.")

    if payload.website:  # honeypot filled: almost certainly a bot, pretend success
        return ack

    db.add(Enquiry(**payload.model_dump(exclude={"website"})))
    db.commit()
    return ack
