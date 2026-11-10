from datetime import date, datetime, timezone

from sqlalchemy import JSON, Boolean, Date, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SiteSettings(Base):
    """A single row holding the editable details shown across the site."""

    __tablename__ = "site_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    centre_name: Mapped[str] = mapped_column(String(120))
    tagline: Mapped[str] = mapped_column(String(200))
    address: Mapped[str] = mapped_column(String(300))
    phone: Mapped[str] = mapped_column(String(30))
    whatsapp: Mapped[str] = mapped_column(String(20), default="")  # digits incl. country code, e.g. 919812345678
    email: Mapped[str] = mapped_column(String(120), default="")
    hours: Mapped[str] = mapped_column(String(120))
    maps_url: Mapped[str] = mapped_column(String(600))
    batch_session: Mapped[str] = mapped_column(String(60))
    mentor_name: Mapped[str] = mapped_column(String(120))
    mentor_quote: Mapped[str] = mapped_column(String(300))
    mentor_bio: Mapped[str] = mapped_column(Text)
    mentor_photo_url: Mapped[str] = mapped_column(String(400), default="")
    mentor_credentials: Mapped[list[str]] = mapped_column(JSON, default=list)
    facts: Mapped[list[dict]] = mapped_column(JSON, default=list)  # [{"value": "25", "label": "..."}]


class Program(Base):
    __tablename__ = "programs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(120))
    duration: Mapped[str] = mapped_column(String(40))
    summary: Mapped[str] = mapped_column(Text)
    focus: Mapped[str] = mapped_column(String(120))
    classes: Mapped[str] = mapped_column(String(60))
    tests: Mapped[str] = mapped_column(String(60))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Batch(Base):
    __tablename__ = "batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    track: Mapped[str] = mapped_column(String(60))
    days: Mapped[str] = mapped_column(String(60))
    time: Mapped[str] = mapped_column(String(40))
    starts_on: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="open")  # open | few | waitlist
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Testimonial(Base):
    __tablename__ = "testimonials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_name: Mapped[str] = mapped_column(String(120))
    year: Mapped[str] = mapped_column(String(10))
    score: Mapped[str] = mapped_column(String(20))
    score_label: Mapped[str] = mapped_column(String(120))
    quote: Mapped[str] = mapped_column(Text)
    published: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Enquiry(Base):
    __tablename__ = "enquiries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    phone: Mapped[str] = mapped_column(String(15))
    student_class: Mapped[str] = mapped_column(String(40))
    target: Mapped[str] = mapped_column(String(40))
    message: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="new")  # new | contacted | enrolled | closed
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
