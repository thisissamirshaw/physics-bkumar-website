import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["ADMIN_PASSWORD"] = "test-pass"
os.environ["SECRET_KEY"] = "test-secret"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.security import limiter  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _reset_limits():
    limiter.reset()


@pytest.fixture
def auth(client):
    r = client.post("/api/admin/login", json={"password": "test-pass"})
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
    assert client.post("/api/admin/login", json={"password": "wrong"}).status_code == 401


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
