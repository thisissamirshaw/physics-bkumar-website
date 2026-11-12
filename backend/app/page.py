"""Editable homepage copy that is not a table of rows: hero, section headings, method steps,
syllabus, enquiry-form options, branding, SEO and site status.

Each top-level block is stored as one JSON row in `page_docs`. The defaults below are what the
site shows until a block is edited in the console, so a fresh database needs no seeding and
old databases pick up new fields automatically.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import PageDoc

Short = Annotated[str, Field(max_length=80)]
Line = Annotated[str, Field(max_length=160)]
Para = Annotated[str, Field(max_length=600)]
Accent = Literal["blue", "teal", "violet", "crimson", "amber"]


class Hero(BaseModel):
    eyebrow: Short = "Physics coaching · New Delhi"
    title: Line = "Physics, built from"
    title_accent: Short = "first principles."
    lede: Para = (
        "Small batches for Class 11 and 12, JEE Main & Advanced, and NEET. "
        "Every chapter is derived, then drilled, then tested."
    )
    cta_primary: Short = "Book a free demo class"
    cta_secondary: Short = "See programs"
    tracks: Annotated[list[Short], Field(max_length=8)] = ["CBSE 11–12", "JEE Main", "JEE Advanced", "NEET"]
    show_simulation: bool = True


class Announcement(BaseModel):
    enabled: bool = False
    text: Annotated[str, Field(max_length=200)] = ""
    link_label: Short = ""
    link_url: Annotated[str, Field(max_length=400)] = ""


class SectionHead(BaseModel):
    show: bool = True
    eyebrow: Short = ""
    title: Line = ""
    intro: Annotated[str, Field(max_length=400)] = ""


class Sections(BaseModel):
    facts: SectionHead = SectionHead()
    programs: SectionHead = SectionHead(
        eyebrow="Programs",
        title="One subject. Three ways to sit the exam.",
        intro=(
            "The same physics underneath, with different depth, pace and question style for each exam. "
            "Pick the track that matches your target."
        ),
    )
    method: SectionHead = SectionHead(
        eyebrow="Method",
        title="How every chapter is taught",
        intro="The same four steps, in the same order, for every topic from kinematics to semiconductors.",
    )
    syllabus: SectionHead = SectionHead(
        eyebrow="Syllabus",
        title="Everything from units to nuclei",
        intro="The full Class 11–12 physics syllabus, which is also the common ground of JEE and NEET.",
    )
    mentor: SectionHead = SectionHead(eyebrow="Your teacher")
    results: SectionHead = SectionHead(
        eyebrow="Results",
        title="What students say",
        intro="Scores and words from students who studied here.",
    )
    batches: SectionHead = SectionHead(
        eyebrow="Batches",
        title="Upcoming batches",
        intro="Seats are limited so every student gets attention. Book a demo class to reserve a seat.",
    )
    visit: SectionHead = SectionHead(eyebrow="Visit the centre", title="Sit in on a class before you decide.")


class Step(BaseModel):
    title: Annotated[str, Field(min_length=1, max_length=60)]
    text: Annotated[str, Field(max_length=300)] = ""


class Method(BaseModel):
    steps: Annotated[list[Step], Field(max_length=8)] = [
        Step(title="Concept", text="Start from what is physically happening, with a diagram on the board before any formula."),
        Step(title="Derivation", text="Build the result yourself, so `v² = u² + 2as` is something you can rebuild, not memorise."),
        Step(title="Problems", text="Graded sets, from NCERT to JEE Advanced, solved in class and then on your own."),
        Step(title="Test & review", text="A timed chapter test, then a one-on-one review of every mistake."),
    ]


class Unit(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=60)]
    grade: Annotated[str, Field(max_length=40)] = ""
    chapters: Annotated[list[Short], Field(max_length=30)] = []


class Syllabus(BaseModel):
    units: Annotated[list[Unit], Field(max_length=16)] = [
        Unit(name="Mechanics", grade="Class 11", chapters=[
            "Units & dimensions", "Kinematics", "Laws of motion", "Work, energy, power",
            "Rotational motion", "Gravitation", "Properties of matter",
        ]),
        Unit(name="Heat & waves", grade="Class 11", chapters=[
            "Thermal properties", "Thermodynamics", "Kinetic theory", "Oscillations (SHM)", "Waves",
        ]),
        Unit(name="Electromagnetism", grade="Class 12", chapters=[
            "Electrostatics", "Capacitance", "Current electricity", "Magnetism", "EM induction",
            "Alternating current", "EM waves",
        ]),
        Unit(name="Optics", grade="Class 12", chapters=["Ray optics", "Optical instruments", "Wave optics"]),
        Unit(name="Modern physics", grade="Class 12", chapters=["Dual nature", "Atoms", "Nuclei", "Semiconductors"]),
    ]


Option = Annotated[str, Field(min_length=1, max_length=40)]


class EnquiryForm(BaseModel):
    enabled: bool = True
    title: Short = "Book a free demo class"
    button_label: Short = "Request a call back"
    note: Line = "We’ll call to fix a demo class time that suits you."
    message_placeholder: Line = "School, preferred timing, weak chapters…"
    closed_text: Annotated[str, Field(max_length=300)] = (
        "Online booking is paused right now. Please call us to book a demo class."
    )
    classes: Annotated[list[Option], Field(min_length=1, max_length=12)] = [
        "Class 11", "Class 12", "12th pass (dropper)", "Class 10 (foundation)",
    ]
    targets: Annotated[list[Option], Field(min_length=1, max_length=12)] = [
        "JEE Main & Advanced", "NEET", "Boards only",
    ]
    whatsapp_message: Annotated[str, Field(max_length=300)] = "Hi, I would like to book a free physics demo class."


class Branding(BaseModel):
    brand_mark: Annotated[str, Field(min_length=1, max_length=3)] = "BK"
    brand_sub: Short = "Class 11–12 · JEE · NEET"
    header_cta: Annotated[str, Field(max_length=40)] = "Book a demo class"
    accent: Accent = "blue"
    footer_note: Short = "New Delhi"
    footer_equation: Annotated[str, Field(max_length=40)] = "F = dp/dt"


class Seo(BaseModel):
    title: Annotated[str, Field(max_length=120)] = (
        "Physics by B. Kumar · Class 11–12, JEE & NEET Physics Coaching, New Delhi"
    )
    description: Annotated[str, Field(max_length=300)] = (
        "Small-batch physics coaching in New Delhi for Class 11–12 (CBSE), JEE Main & Advanced, and NEET. "
        "Concept, derivation, problems, test. Book a free demo class."
    )


class Status(BaseModel):
    maintenance: bool = False
    maintenance_title: Line = "We’ll be right back"
    maintenance_message: Annotated[str, Field(max_length=400)] = (
        "The website is being updated. Please check again in a little while, or call us."
    )


class PageContent(BaseModel):
    hero: Hero = Hero()
    announcement: Announcement = Announcement()
    sections: Sections = Sections()
    method: Method = Method()
    syllabus: Syllabus = Syllabus()
    form: EnquiryForm = EnquiryForm()
    branding: Branding = Branding()
    seo: Seo = Seo()
    status: Status = Status()


class PagePatch(BaseModel):
    """Any subset of the blocks. Blocks left out are not touched."""

    hero: Hero | None = None
    announcement: Announcement | None = None
    sections: Sections | None = None
    method: Method | None = None
    syllabus: Syllabus | None = None
    form: EnquiryForm | None = None
    branding: Branding | None = None
    seo: Seo | None = None
    status: Status | None = None


BLOCKS: dict[str, type[BaseModel]] = {
    name: field.annotation for name, field in PageContent.model_fields.items()  # type: ignore[misc]
}

BLOCK_LABELS = {
    "hero": "Hero",
    "announcement": "Announcement bar",
    "sections": "Section headings",
    "method": "Method steps",
    "syllabus": "Syllabus",
    "form": "Enquiry form",
    "branding": "Branding",
    "seo": "Search & sharing",
    "status": "Site status",
}


def load_page(db: Session) -> PageContent:
    blocks: dict[str, BaseModel] = {}
    for doc in db.scalars(select(PageDoc)):
        model = BLOCKS.get(doc.key)
        if model is None:
            continue
        try:
            blocks[doc.key] = model.model_validate(doc.value)
        except ValidationError:
            # A block saved by an older version that no longer fits: show the defaults.
            continue
    return PageContent(**blocks)


def save_page(db: Session, patch: PagePatch) -> list[str]:
    """Store the given blocks. Returns the keys that were written. Caller commits."""
    written = []
    for key in patch.model_fields_set:
        block = getattr(patch, key)
        if block is None:
            continue
        doc = db.get(PageDoc, key)
        if doc is None:
            db.add(PageDoc(key=key, value=block.model_dump()))
        else:
            doc.value = block.model_dump()
        written.append(key)
    return written


def replace_page(db: Session, patch: PagePatch) -> None:
    """Restore from a backup: blocks in the backup are written, the rest go back to defaults."""
    for doc in db.scalars(select(PageDoc)).all():
        db.delete(doc)
    db.flush()
    save_page(db, patch)
