import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["SUPERADMIN_EMAIL"] = "boss@example.com"
os.environ["SUPERADMIN_PASSWORD"] = "test-pass-1"
os.environ["SECRET_KEY"] = "test-secret"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.security import limiter  # noqa: E402


LOGIN = {"email": "boss@example.com", "password": "test-pass-1"}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _reset_limits():
    limiter.reset()


@pytest.fixture
def auth(client):
    r = client.post("/api/admin/login", json=LOGIN)
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['token']}"}


def enquiry(**kw):
    body = {"name": "Aarav Sharma", "phone": "+91 98765 43210", "student_class": "Class 11", "target": "NEET"}
    body.update(kw)
    return body


def test_content_is_seeded(client):
    r = client.get("/api/content")
    assert r.status_code == 200
    data = r.json()
    assert data["settings"]["centre_name"] == "Physics by B. Kumar"
    assert len(data["programs"]) == 3
    assert len(data["batches"]) == 4
    assert len(data["settings"]["facts"]) == 4


def test_enquiry_saved_and_phone_normalised(client, auth):
    r = client.post("/api/enquiries", json=enquiry())
    assert r.status_code == 201
    assert "Aarav" in r.json()["message"]
    rows = client.get("/api/admin/enquiries", headers=auth).json()
    assert rows[0]["phone"] == "9876543210"
    assert rows[0]["status"] == "new"


@pytest.mark.parametrize("phone", ["12345", "5876543210", "98765432100"])
def test_enquiry_rejects_bad_phone(client, phone):
    assert client.post("/api/enquiries", json=enquiry(phone=phone)).status_code == 422


def test_enquiry_rejects_unknown_target(client):
    assert client.post("/api/enquiries", json=enquiry(target="UPSC")).status_code == 422


def test_honeypot_is_not_saved(client, auth):
    before = len(client.get("/api/admin/enquiries", headers=auth).json())
    r = client.post("/api/enquiries", json=enquiry(name="Bot Person", website="spam.example"))
    assert r.status_code == 201
    assert len(client.get("/api/admin/enquiries", headers=auth).json()) == before


def test_enquiry_rate_limited(client):
    codes = [client.post("/api/enquiries", json=enquiry()).status_code for _ in range(6)]
    assert codes[:5] == [201] * 5 and codes[5] == 429


def test_admin_requires_auth(client):
    assert client.get("/api/admin/enquiries").status_code == 401
    assert client.get("/api/admin/enquiries", headers={"Authorization": "Bearer junk"}).status_code == 401
    assert client.post("/api/admin/login", json={**LOGIN, "password": "wrong"}).status_code == 401
    assert client.post("/api/admin/login", json={**LOGIN, "email": "someone@else.com"}).status_code == 401
    # Email is not case sensitive.
    assert client.post("/api/admin/login", json={**LOGIN, "email": " Boss@Example.com "}).status_code == 200


def test_enquiry_status_update_filter_and_export(client, auth):
    client.post("/api/enquiries", json=enquiry(name="Diya Verma"))
    rows = client.get("/api/admin/enquiries", headers=auth).json()
    eid = next(r["id"] for r in rows if r["name"] == "Diya Verma")
    r = client.patch(f"/api/admin/enquiries/{eid}", json={"status": "contacted", "notes": "Called"}, headers=auth)
    assert r.status_code == 200 and r.json()["status"] == "contacted"
    filtered = client.get("/api/admin/enquiries?status=contacted", headers=auth).json()
    assert [r["id"] for r in filtered] == [eid]
    assert client.get("/api/admin/enquiries/summary", headers=auth).json()["contacted"] == 1
    csv = client.get("/api/admin/enquiries/export.csv", headers=auth)
    assert csv.status_code == 200 and "Diya Verma" in csv.text


def test_batch_crud_and_inactive_hidden(client, auth):
    r = client.post("/api/admin/batches", headers=auth, json={
        "name": "Crash course", "track": "JEE", "days": "Daily", "time": "07:00–09:00",
        "starts_on": "2027-01-10", "status": "open",
    })
    assert r.status_code == 201
    bid = r.json()["id"]
    assert any(b["id"] == bid for b in client.get("/api/content").json()["batches"])

    r = client.patch(f"/api/admin/batches/{bid}", headers=auth, json={"active": False})
    assert r.status_code == 200 and r.json()["active"] is False
    assert not any(b["id"] == bid for b in client.get("/api/content").json()["batches"])

    assert client.patch(f"/api/admin/batches/{bid}", headers=auth, json={"status": "maybe"}).status_code == 422
    assert client.delete(f"/api/admin/batches/{bid}", headers=auth).status_code == 204
    assert client.delete(f"/api/admin/batches/{bid}", headers=auth).status_code == 404


def test_settings_update(client, auth):
    s = client.get("/api/admin/settings", headers=auth).json()
    s["phone"] = "+91 98100 00000"
    s.pop("id", None)
    r = client.put("/api/admin/settings", headers=auth, json=s)
    assert r.status_code == 200
    assert client.get("/api/content").json()["settings"]["phone"] == "+91 98100 00000"


# ---------- Super admin console ----------

def test_page_defaults_and_edit(client, auth):
    page = client.get("/api/content").json()["page"]
    assert page["hero"]["title_accent"] == "first principles."
    assert len(page["method"]["steps"]) == 4
    assert page["sections"]["programs"]["show"] is True

    hero = {**page["hero"], "title": "Physics, learnt from"}
    sections = {**page["sections"], "syllabus": {**page["sections"]["syllabus"], "show": False}}
    r = client.put("/api/admin/page", headers=auth, json={"hero": hero, "sections": sections})
    assert r.status_code == 200
    page = client.get("/api/content").json()["page"]
    assert page["hero"]["title"] == "Physics, learnt from"
    assert page["sections"]["syllabus"]["show"] is False
    assert len(page["syllabus"]["units"]) == 5  # blocks not sent keep their value

    assert client.put("/api/admin/page", json={"hero": hero}).status_code == 401
    bad = client.put("/api/admin/page", headers=auth, json={"branding": {"accent": "rainbow"}})
    assert bad.status_code == 422


def test_form_options_and_pause(client, auth):
    form = client.get("/api/admin/page", headers=auth).json()["form"]
    r = client.put("/api/admin/page", headers=auth, json={"form": {**form, "targets": ["NEET", "Olympiad"]}})
    assert r.status_code == 200
    assert client.post("/api/enquiries", json=enquiry(target="Olympiad")).status_code == 201
    assert client.post("/api/enquiries", json=enquiry(target="Boards only")).status_code == 422

    client.put("/api/admin/page", headers=auth, json={"form": {**form, "enabled": False}})
    r = client.post("/api/enquiries", json=enquiry())
    assert r.status_code == 403 and "paused" in r.json()["detail"]
    client.put("/api/admin/page", headers=auth, json={"form": form})
    assert client.post("/api/enquiries", json=enquiry()).status_code == 201


def test_enquiry_search_manual_add_and_bulk(client, auth):
    r = client.post("/api/admin/enquiries", headers=auth, json={
        "name": "Walk  In Kabir", "phone": "9123456780", "notes": "Came with parent",
    })
    assert r.status_code == 201 and r.json()["name"] == "Walk In Kabir"
    kabir = r.json()["id"]
    assert client.post("/api/admin/enquiries", headers=auth, json={"name": "X Y", "phone": "123"}).status_code == 422

    found = client.get("/api/admin/enquiries?q=kabir", headers=auth).json()
    assert [e["id"] for e in found] == [kabir]
    assert client.get("/api/admin/enquiries?q=91234", headers=auth).json()[0]["id"] == kabir
    assert found[0]["created_at"].endswith(("Z", "+00:00"))  # always carries its UTC offset

    other = client.post("/api/admin/enquiries", headers=auth, json={"name": "Meera Nair", "phone": "9000000001"}).json()["id"]
    r = client.post("/api/admin/enquiries/bulk", headers=auth, json={"ids": [kabir, other], "action": "status", "status": "enrolled"})
    assert r.json()["count"] == 2
    assert {e["id"] for e in client.get("/api/admin/enquiries?status=enrolled", headers=auth).json()} >= {kabir, other}
    assert client.post("/api/admin/enquiries/bulk", headers=auth, json={"ids": [kabir], "action": "status"}).status_code == 422
    r = client.post("/api/admin/enquiries/bulk", headers=auth, json={"ids": [kabir, other], "action": "delete"})
    assert r.json()["count"] == 2
    assert client.get("/api/admin/enquiries?q=kabir", headers=auth).json() == []


def test_new_items_go_last_and_reorder(client, auth):
    before = client.get("/api/admin/programs", headers=auth).json()
    r = client.post("/api/admin/programs", headers=auth, json={
        "code": "TRACK · OLYMPIAD", "title": "Olympiad", "duration": "1 year", "summary": "", "focus": "",
        "classes": "", "tests": "",
    })
    assert r.status_code == 201
    new = r.json()
    assert new["sort_order"] == max(p["sort_order"] for p in before) + 1

    ids = [new["id"]] + [p["id"] for p in before]
    r = client.post("/api/admin/programs/reorder", headers=auth, json={"ids": ids})
    assert [p["id"] for p in r.json()] == ids
    assert [p["id"] for p in client.get("/api/content").json()["programs"]] == ids
    client.delete(f"/api/admin/programs/{new['id']}", headers=auth)


def test_stats(client, auth):
    client.post("/api/enquiries", json=enquiry(name="Stat Student"))
    s = client.get("/api/admin/stats", headers=auth).json()
    assert s["enquiries"]["total"] == sum(s["enquiries"][k] for k in ("new", "contacted", "enrolled", "closed"))
    assert len(s["daily"]) == 14 and s["daily"][-1]["count"] >= 1
    assert s["enquiries"]["today"] == s["daily"][-1]["count"]
    assert s["enquiries"]["this_week"] >= 1
    assert any(row["label"] == "NEET" for row in s["by_target"])
    assert s["recent"][0]["name"] == "Stat Student"
    labels = {c["label"]: c["done"] for c in s["checklist"]}
    assert labels["Add a WhatsApp number"] is False
    assert labels["Change the starter password"] is True  # the test account does not use the built-in one


def test_activity_log(client, auth):
    client.post("/api/admin/login", json={**LOGIN, "password": "nope"})
    rows = client.get("/api/admin/activity", headers=auth).json()
    actions = [r["action"] for r in rows]
    assert "login" in actions and "login.failed" in actions and "page.update" in actions
    assert rows[0]["id"] > rows[-1]["id"]  # newest first
    assert all("nope" not in r["detail"] for r in rows)  # passwords are never logged


def test_media_upload_and_cleanup(client, auth):
    png = b"\x89PNG\r\n\x1a\n" + b"0" * 64
    bad = client.post("/api/admin/media?filename=a.txt", headers={**auth, "Content-Type": "text/plain"}, content=b"hi")
    assert bad.status_code == 415
    big = client.post("/api/admin/media", headers={**auth, "Content-Type": "image/png"}, content=b"0" * 1_600_000)
    assert big.status_code == 413
    assert client.post("/api/admin/media", headers={"Content-Type": "image/png"}, content=png).status_code == 401

    first = client.post("/api/admin/media?filename=old.png", headers={**auth, "Content-Type": "image/png"}, content=png).json()
    second = client.post("/api/admin/media?filename=new.png", headers={**auth, "Content-Type": "image/png"}, content=png).json()
    got = client.get(second["url"])
    assert got.status_code == 200 and got.content == png and got.headers["content-type"] == "image/png"

    s = client.get("/api/admin/settings", headers=auth).json()
    s["mentor_photo_url"] = second["url"]
    assert client.put("/api/admin/settings", headers=auth, json=s).status_code == 200
    assert client.get(second["url"]).status_code == 200
    assert client.get(first["url"]).status_code == 404  # unused upload removed


def test_backup_and_restore(client, auth):
    backup = client.get("/api/admin/backup", headers=auth).json()
    assert backup["kind"] == "physics-bkumar-backup" and len(backup["programs"]) == 3
    enquiries_before = len(backup["enquiries"])
    assert enquiries_before > 0

    # Wreck things, then restore.
    for p in backup["programs"]:
        client.delete(f"/api/admin/programs/{p['id']}", headers=auth)
    client.put("/api/admin/page", headers=auth, json={"hero": {**backup["page"]["hero"], "title": "Broken"}})
    assert client.get("/api/content").json()["programs"] == []

    assert client.post("/api/admin/restore", headers=auth, json={}).status_code == 422
    r = client.post("/api/admin/restore", headers=auth, json=backup)
    assert r.status_code == 200
    content = client.get("/api/content").json()
    assert [p["title"] for p in content["programs"]] == [p["title"] for p in backup["programs"]]
    assert content["page"]["hero"]["title"] == backup["page"]["hero"]["title"]
    # Enquiries are left alone unless asked for.
    assert len(client.get("/api/admin/enquiries", headers=auth).json()) == enquiries_before

    trimmed = {"enquiries": backup["enquiries"][:1]}
    r = client.post("/api/admin/restore?include_enquiries=true", headers=auth, json=trimmed)
    assert r.status_code == 200
    rows = client.get("/api/admin/enquiries", headers=auth).json()
    assert len(rows) == 1 and rows[0]["name"] == backup["enquiries"][0]["name"]

    # A bad file changes nothing.
    bad = {**backup, "batches": [{"name": "No date"}]}
    assert client.post("/api/admin/restore", headers=auth, json=bad).status_code == 422
    assert len(client.get("/api/content").json()["programs"]) == 3


def test_account_email_password_and_sessions(client, auth):
    me = client.get("/api/admin/me", headers=auth).json()
    assert me["email"] == "boss@example.com" and me["starter_password"] is False

    wrong = client.put("/api/admin/account/password", headers=auth, json={"current_password": "x", "new_password": "longenough1"})
    assert wrong.status_code == 403
    short = client.put("/api/admin/account/password", headers=auth, json={"current_password": LOGIN["password"], "new_password": "short"})
    assert short.status_code == 422

    r = client.put("/api/admin/account/password", headers=auth, json={"current_password": LOGIN["password"], "new_password": "a-new-password"})
    assert r.status_code == 200
    fresh = {"Authorization": f"Bearer {r.json()['token']}"}
    assert client.get("/api/admin/me", headers=auth).status_code == 401  # old session is signed out
    assert client.get("/api/admin/me", headers=fresh).status_code == 200
    assert client.post("/api/admin/login", json=LOGIN).status_code == 401
    assert client.post("/api/admin/login", json={**LOGIN, "password": "a-new-password"}).status_code == 200

    assert client.put("/api/admin/account/email", headers=fresh, json={"email": "not-an-email", "current_password": "a-new-password"}).status_code == 422
    r = client.put("/api/admin/account/email", headers=fresh, json={"email": "Owner@Example.com", "current_password": "a-new-password"})
    assert r.status_code == 200 and r.json()["email"] == "owner@example.com"
    assert client.post("/api/admin/login", json={"email": "owner@example.com", "password": "a-new-password"}).status_code == 200

    r = client.post("/api/admin/account/signout-all", headers=fresh)
    assert r.status_code == 200
    assert client.get("/api/admin/me", headers=fresh).status_code == 401
    assert client.get("/api/admin/me", headers={"Authorization": f"Bearer {r.json()['token']}"}).status_code == 200


def test_starter_account_and_reset():
    """With no env overrides the account is the documented starter one, flagged for a password change."""
    from app import seed as seed_module
    from app.config import get_settings
    from app.db import SessionLocal
    from app.models import AdminUser
    from app.security import verify_password

    cfg = get_settings()
    old = (cfg.superadmin_email, cfg.superadmin_password)
    cfg.superadmin_email, cfg.superadmin_password = "superadmin@example.com", "12345678"
    try:
        with SessionLocal() as db:
            user = seed_module.ensure_superadmin(db, reset=True)
            assert user.email == "superadmin@example.com" and user.starter_password is True
            assert verify_password("12345678", user.password_hash)
            assert "12345678" not in user.password_hash  # stored hashed
            assert db.query(AdminUser).count() == 1
    finally:
        cfg.superadmin_email, cfg.superadmin_password = old


def test_frontend_defaults_match_backend():
    """The site shows frontend/src/pageDefaults.json while loading and in the static build.
    Regenerate it when the defaults in app/page.py change:
        .venv/bin/python -c "import json; from app.page import PageContent; print(json.dumps(PageContent().model_dump(), ensure_ascii=False, indent=2))" > ../frontend/src/pageDefaults.json
    """
    import json
    from pathlib import Path

    from app.page import PageContent

    path = Path(__file__).resolve().parents[2] / "frontend" / "src" / "pageDefaults.json"
    assert json.loads(path.read_text(encoding="utf-8")) == PageContent().model_dump()
