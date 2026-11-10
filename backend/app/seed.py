"""First-run content. Everything here can be edited later from /admin.

Values like "Street address, New Delhi", "+91 00000 00000" and the
"Sample student" testimonials are placeholders to replace with the centre's real details.
"""

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Batch, Program, SiteSettings, Testimonial

MAPS_URL = (
    "https://www.google.com/maps/place/Physics+by+B+kumar/@28.5534024,77.1729163,896m/"
    "data=!3m2!1e3!4b1!4m6!3m5!1s0x390d1d14c3f57f7d:0xc3bf5564dc01efc1!8m2!3d28.5533977"
    "!4d77.1754912!16s%2Fg%2F11nk80mpgp"
)


def seed(db: Session) -> None:
    if db.scalar(select(SiteSettings).limit(1)) is not None:
        return

    db.add(
        SiteSettings(
            id=1,
            centre_name="Physics by B. Kumar",
            tagline="Physics coaching for Class 11–12, JEE and NEET",
            address="Street address, New Delhi",
            phone="+91 00000 00000",
            whatsapp="",
            email="",
            hours="Mon–Sat, 10:00–21:00",
            maps_url=MAPS_URL,
            batch_session="2027 session",
            mentor_name="B. Kumar",
            mentor_quote="If you can draw the free-body diagram, you've already solved half the problem.",
            mentor_bio=(
                "Every class is taught by B. Kumar personally. Replace this with a short bio: "
                "education, years of teaching, and what makes the classes different."
            ),
            mentor_photo_url="",
            mentor_credentials=["Qualification", "Years of teaching", "Students mentored"],
            facts=[
                {"value": "25", "label": "Students per batch, max"},
                {"value": "3", "label": "Tracks: Boards, JEE, NEET"},
                {"value": "Weekly", "label": "Chapter tests with review"},
                {"value": "1 : 1", "label": "Doubt sessions every Sunday"},
            ],
        )
    )

    db.add_all(
        [
            Program(
                code="TRACK · BOARDS", title="Class 11 & 12", duration="2 years",
                summary="Full CBSE syllabus with NCERT at the core. Derivations written out, numericals timed, and practicals explained.",
                focus="NCERT, derivations, board pattern", classes="4 per week", tests="Chapter + pre-board", sort_order=1,
            ),
            Program(
                code="TRACK · JEE", title="JEE Main & Advanced", duration="1–2 years",
                summary="Concepts taken to Advanced depth: multi-concept problems, calculus in mechanics, and speed for Main.",
                focus="Problem solving, Irodov-level", classes="5 per week", tests="Weekly + full mocks", sort_order=2,
            ),
            Program(
                code="TRACK · NEET", title="NEET Physics", duration="1–2 years",
                summary="The subject most NEET aspirants fear, made scoring. Formula fluency, shortcuts that hold up, and accuracy drills.",
                focus="NCERT + MCQ speed", classes="4 per week", tests="Weekly 45-question MCQ", sort_order=3,
            ),
        ]
    )

    db.add_all(
        [
            Batch(name="Class 11 Foundation", track="Boards + JEE", days="Mon · Wed · Fri", time="16:00–18:00", starts_on=date(2027, 4, 5), status="open", sort_order=1),
            Batch(name="Class 12 Boards", track="Boards", days="Tue · Thu · Sat", time="16:00–18:00", starts_on=date(2027, 4, 1), status="few", sort_order=2),
            Batch(name="JEE Target", track="JEE Main + Adv", days="Mon – Fri", time="18:30–20:30", starts_on=date(2027, 4, 12), status="open", sort_order=3),
            Batch(name="NEET Target", track="NEET", days="Tue · Thu · Sat", time="18:30–20:30", starts_on=date(2027, 4, 12), status="waitlist", sort_order=4),
        ]
    )

    # Hidden templates: edit them with real reviews in /admin, then tick "Show on website".
    db.add_all(
        [
            Testimonial(student_name="Sample student", year="2026", score="—", score_label="Physics percentile · JEE Main",
                        quote="Replace with a real student's words about the class.", published=False, sort_order=1),
            Testimonial(student_name="Sample student", year="2026", score="—", score_label="out of 180 · NEET Physics",
                        quote="Replace with a real student's words about the class.", published=False, sort_order=2),
            Testimonial(student_name="Sample student", year="2026", score="—", score_label="out of 70 · CBSE Class 12 theory",
                        quote="Replace with a real student's words about the class.", published=False, sort_order=3),
        ]
    )
    db.commit()
