# Physics by B. Kumar: website

The website for a physics coaching centre for Class 11–12, JEE and NEET.

- **frontend/**: React 19 + TypeScript + Vite. It has the public homepage and an admin dashboard at `/admin`.
- **backend/**: FastAPI + SQLAlchemy + SQLite. It holds the content and the demo-class enquiries, and handles admin sign-in.
- **design-preview.html**: the original static design mock, kept for reference.

## Run it locally

```bash
./dev.sh
```

- Site: http://localhost:5173
- Admin: http://localhost:5173/admin (default password `admin` in development)
- API docs: http://localhost:8000/api/docs

On first start the backend creates `backend/physics.db` and fills it with starter content.

Or run the two parts separately:

```bash
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload            # API on :8000

cd frontend && npm install && npm run dev          # site on :5173, proxies /api to :8000
```

Tests: `cd backend && .venv/bin/python -m pytest`

## Before going live: replace the placeholders

Sign in at `/admin` and fill in:

| Where | What |
|---|---|
| Site details → Centre | Real address, phone, WhatsApp number (shows a floating WhatsApp button), email, hours |
| Site details → Teacher | B. Kumar's bio, quote, credentials, photo (put it in `frontend/public/`, e.g. `/bkumar.jpg`) |
| Site details → Facts strip | The four numbers under the headline. The starter values are made up |
| Batches | The real timetable and seat status |
| Programs | Classes per week and tests for each track |
| Reviews | Three hidden templates. Edit them with real students' results (with permission), then tick "Show on website". The section stays hidden until at least one review is published |

## What the admin can do

- **Enquiries**: every demo-class request from the site. Filter by New, Contacted, Enrolled or Closed, change the status, add notes, tap to call or WhatsApp, and export to CSV. The list refreshes every 30 s.
- **Batches / Programs / Reviews**: add, edit, hide or delete.
- **Site details**: contact info, teacher profile, facts.

## Deploy

One Docker container serves both the API and the built site:

```bash
docker build -t physics-bk .
docker run -d -p 8000:8000 -v physics-data:/data \
  -e SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')" \
  -e ADMIN_PASSWORD="choose-a-strong-password" \
  physics-bk
```

In production (`APP_ENV=production`, the Docker default) the server refuses to start if `SECRET_KEY` or `ADMIN_PASSWORD` is left at its default. The SQLite database lives in the `/data` volume, so back that up.

This works on any host that runs Docker (Railway, Render, Fly.io, a VPS). Put it behind HTTPS (the host usually does this for you) and point the domain at it.

Without Docker: run `npm run build` in `frontend/`, then run uvicorn from `backend/`. FastAPI serves `frontend/dist` automatically when it exists.

## API

| Method | Path | |
|---|---|---|
| GET | `/api/content` | Everything the homepage shows |
| POST | `/api/enquiries` | Demo-class request. Validates Indian mobile numbers, rate-limited to 5 per IP per 10 min, honeypot field against bots |
| POST | `/api/admin/login` | `{password}` → bearer token (12 h) |
| GET/PATCH/DELETE | `/api/admin/enquiries[/{id}]` | `?status=new` filter, plus `/summary` and `/export.csv` |
| CRUD | `/api/admin/batches`, `/programs`, `/testimonials` | |
| GET/PUT | `/api/admin/settings` | |
