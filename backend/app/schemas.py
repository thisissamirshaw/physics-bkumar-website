import re
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

Str = Annotated[str, Field(max_length=300)]
BatchStatus = Literal["open", "few", "waitlist"]
EnquiryStatus = Literal["new", "contacted", "enrolled", "closed"]
StudentClass = Literal["Class 11", "Class 12", "12th pass (dropper)", "Class 10 (foundation)"]
Target = Literal["JEE Main & Advanced", "NEET", "Boards only"]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


def _partial(model: type[BaseModel], name: str) -> type[BaseModel]:
    """Build an all-optional copy of a model, for PATCH bodies."""
    from pydantic import create_model

    fields = {}
    for k, f in model.model_fields.items():
        inner = Annotated[f.annotation, *f.metadata] if f.metadata else f.annotation
        fields[k] = (inner | None, None)
    return create_model(name, **fields)  # type: ignore[call-overload]


# ---------- Site settings ----------

class Fact(BaseModel):
    value: Annotated[str, Field(max_length=20)]
    label: Annotated[str, Field(max_length=60)]


class SettingsIn(BaseModel):
    centre_name: Annotated[str, Field(min_length=1, max_length=120)]
    tagline: Annotated[str, Field(max_length=200)]
    address: Str
    phone: Annotated[str, Field(max_length=30)]
    whatsapp: Annotated[str, Field(max_length=20, pattern=r"^\d*$")] = ""
    email: Annotated[str, Field(max_length=120)] = ""
    hours: Annotated[str, Field(max_length=120)]
    maps_url: Annotated[str, Field(max_length=600)]
    batch_session: Annotated[str, Field(max_length=60)]
    mentor_name: Annotated[str, Field(max_length=120)]
    mentor_quote: Str
    mentor_bio: Annotated[str, Field(max_length=2000)]
    mentor_photo_url: Annotated[str, Field(max_length=400)] = ""
    mentor_credentials: Annotated[list[Annotated[str, Field(max_length=80)]], Field(max_length=8)] = []
    facts: Annotated[list[Fact], Field(max_length=4)] = []


class SettingsOut(SettingsIn, ORM):
    pass


# ---------- Programs ----------

class ProgramIn(BaseModel):
    code: Annotated[str, Field(min_length=1, max_length=40)]
    title: Annotated[str, Field(min_length=1, max_length=120)]
    duration: Annotated[str, Field(max_length=40)]
    summary: Annotated[str, Field(max_length=600)]
    focus: Annotated[str, Field(max_length=120)]
    classes: Annotated[str, Field(max_length=60)]
    tests: Annotated[str, Field(max_length=60)]
    sort_order: int = 0


ProgramPatch = _partial(ProgramIn, "ProgramPatch")


class ProgramOut(ProgramIn, ORM):
    id: int


# ---------- Batches ----------

class BatchIn(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=120)]
    track: Annotated[str, Field(max_length=60)]
    days: Annotated[str, Field(max_length=60)]
    time: Annotated[str, Field(max_length=40)]
    starts_on: date
    status: BatchStatus = "open"
    active: bool = True
    sort_order: int = 0


BatchPatch = _partial(BatchIn, "BatchPatch")


class BatchOut(BatchIn, ORM):
    id: int


# ---------- Testimonials ----------

class TestimonialIn(BaseModel):
    student_name: Annotated[str, Field(min_length=1, max_length=120)]
    year: Annotated[str, Field(max_length=10)]
    score: Annotated[str, Field(max_length=20)]
    score_label: Annotated[str, Field(max_length=120)]
    quote: Annotated[str, Field(max_length=600)]
    published: bool = True
    sort_order: int = 0


TestimonialPatch = _partial(TestimonialIn, "TestimonialPatch")


class TestimonialOut(TestimonialIn, ORM):
    id: int


# ---------- Enquiries ----------

INDIAN_MOBILE = re.compile(r"^[6-9]\d{9}$")


class EnquiryIn(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=80)]
    phone: str
    student_class: StudentClass
    target: Target
    message: Annotated[str, Field(max_length=500)] = ""
    website: str = ""  # honeypot: real visitors never see or fill this

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 2:
            raise ValueError("Enter the student's name")
        return v

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) == 12 and digits.startswith("91"):
            digits = digits[2:]
        elif len(digits) == 11 and digits.startswith("0"):
            digits = digits[1:]
        if not INDIAN_MOBILE.match(digits):
            raise ValueError("Enter a valid 10-digit mobile number")
        return digits


class EnquiryPatch(BaseModel):
    status: EnquiryStatus | None = None
    notes: Annotated[str, Field(max_length=2000)] | None = None


class EnquiryOut(ORM):
    id: int
    name: str
    phone: str
    student_class: str
    target: str
    message: str
    status: EnquiryStatus
    notes: str
    created_at: datetime
    updated_at: datetime


class EnquiryAck(BaseModel):
    ok: bool = True
    message: str


# ---------- Public content bundle ----------

class Content(BaseModel):
    settings: SettingsOut
    programs: list[ProgramOut]
    batches: list[BatchOut]
    testimonials: list[TestimonialOut]


# ---------- Auth ----------

class LoginIn(BaseModel):
    password: Annotated[str, Field(min_length=1, max_length=200)]


class TokenOut(BaseModel):
    token: str
    expires_at: int
