import re
from datetime import date, datetime, timezone
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, field_validator

from .page import PageContent, PagePatch

Str = Annotated[str, Field(max_length=300)]
BatchStatus = Literal["open", "few", "waitlist"]
EnquiryStatus = Literal["new", "contacted", "enrolled", "closed"]

# SQLite returns datetimes without an offset (they are stored as UTC). Add it back, so the
# browser does not read them as local time.
UtcDatetime = Annotated[datetime, AfterValidator(lambda d: d if d.tzinfo else d.replace(tzinfo=timezone.utc))]


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


def clean_mobile(v: str) -> str:
    digits = re.sub(r"\D", "", v)
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if not INDIAN_MOBILE.match(digits):
        raise ValueError("Enter a valid 10-digit mobile number")
    return digits


class EnquiryIn(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=80)]
    phone: str
    # Checked against the options set in the console (Enquiry form), not a fixed list.
    student_class: Annotated[str, Field(min_length=1, max_length=40)]
    target: Annotated[str, Field(min_length=1, max_length=40)]
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
        return clean_mobile(v)


class AdminEnquiryIn(BaseModel):
    """An enquiry typed in by the admin (phone call, walk-in)."""

    name: Annotated[str, Field(min_length=2, max_length=80)]
    phone: str
    student_class: Annotated[str, Field(max_length=40)] = ""
    target: Annotated[str, Field(max_length=40)] = ""
    message: Annotated[str, Field(max_length=500)] = ""
    status: EnquiryStatus = "new"
    notes: Annotated[str, Field(max_length=2000)] = ""

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: str) -> str:
        return clean_mobile(v)


class EnquiryBulk(BaseModel):
    ids: Annotated[list[int], Field(min_length=1, max_length=1000)]
    action: Literal["status", "delete"]
    status: EnquiryStatus | None = None


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
    created_at: UtcDatetime
    updated_at: UtcDatetime


class EnquiryAck(BaseModel):
    ok: bool = True
    message: str


# ---------- Public content bundle ----------

class Content(BaseModel):
    settings: SettingsOut
    programs: list[ProgramOut]
    batches: list[BatchOut]
    testimonials: list[TestimonialOut]
    page: PageContent


# ---------- Reordering ----------

class ReorderIn(BaseModel):
    ids: Annotated[list[int], Field(max_length=500)]


# ---------- Auth & account ----------

EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
Password = Annotated[str, Field(min_length=1, max_length=200)]
NewPassword = Annotated[str, Field(min_length=8, max_length=200)]


def clean_email(v: str) -> str:
    v = v.strip().lower()
    if len(v) > 160 or not EMAIL.match(v):
        raise ValueError("Enter a valid email address")
    return v


class LoginIn(BaseModel):
    email: Annotated[str, Field(max_length=160)]
    password: Password

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return v.strip().lower()


class AccountOut(BaseModel):
    email: str
    starter_password: bool
    last_login_at: UtcDatetime | None


class TokenOut(BaseModel):
    token: str
    expires_at: int
    account: AccountOut


class EmailChange(BaseModel):
    email: str
    current_password: Password

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return clean_email(v)


class PasswordChange(BaseModel):
    current_password: Password
    new_password: NewPassword


# ---------- Activity ----------

class ActivityOut(ORM):
    id: int
    at: UtcDatetime
    actor: str
    action: str
    detail: str


# ---------- Backup & restore ----------

class EnquiryBackup(BaseModel):
    name: Annotated[str, Field(max_length=80)]
    phone: Annotated[str, Field(max_length=15)]
    student_class: Annotated[str, Field(max_length=40)] = ""
    target: Annotated[str, Field(max_length=40)] = ""
    message: str = ""
    status: EnquiryStatus = "new"
    notes: str = ""
    created_at: datetime | None = None
    updated_at: datetime | None = None


class BackupIn(BaseModel):
    """A file made by "Download backup". Every part is optional; parts left out are not touched."""

    settings: SettingsIn | None = None
    page: PagePatch | None = None
    programs: list[ProgramIn] | None = None
    batches: list[BatchIn] | None = None
    testimonials: list[TestimonialIn] | None = None
    enquiries: list[EnquiryBackup] | None = None
