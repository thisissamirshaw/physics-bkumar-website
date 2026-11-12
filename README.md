# Physics by B. Kumar: website

The website for a physics coaching centre for Class 11–12, JEE and NEET.

- **frontend/**: React 19 + TypeScript + Vite. The public homepage, and the super admin console at `/admin`.
- **backend/**: FastAPI + SQLAlchemy (SQLite or Postgres). It holds the content, the demo-class enquiries and the super admin account.
- **design-preview.html**: the original static design mock, kept for reference.

Visitors never sign in. Only the console at `/admin` has a login.

## Run it locally

```bash
./dev.sh
```

- Site: http://localhost:5173
- Console: http://localhost:5173/admin
- API docs: http://localhost:8000/api/docs

On first start the backend creates `backend/physics.db`, fills it with starter content and creates the super admin account.

Or run the two parts separately:

```bash
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload            # API on :8000

cd frontend && npm install && npm run dev          # site on :5173, proxies /api to :8000
```

Tests: `cd backend && .venv/bin/python -m pytest`

## Super admin sign-in

| | |
|---|---|
| Email | `superadmin@example.com` |
| Password | `12345678` |

**Change the password after the first sign-in** (Account & security). The starter password is written in this public repository, so until it is changed anyone can sign in, read the enquiries and edit the site. The console shows a warning until you do.

- To start with a different email or password, set `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` in `backend/.env` (or the host's environment) before the first start.
- The password is stored hashed (scrypt). Changing it signs out every other device. A sign-in lasts 12 hours, and sign-in attempts are limited to 10 per 10 minutes per address.
- Locked out? From `backend/`, run `.venv/bin/python -m app.reset_admin`. It puts the account back to the configured (or starter) email and password and touches nothing else.

## What the console controls

| Page | What you can do |
|---|---|
| **Dashboard** | New enquiries to call, enquiries per day for 14 days, split by target and class, share that enrolled, what is live on the site, and a checklist of starter values still to replace |
| **Enquiries** | Every demo-class request. Search, filter by status, add phone and walk-in enquiries by hand, notes, call or WhatsApp in one tap, select many to update or delete, export to CSV |
| **Home page top** | Headline, paragraph, buttons, tags, the animated diagram, and an announcement strip |
| **Programs / Batches / Reviews** | Add, edit, copy, delete, reorder with arrows, show or hide with a switch |
| **Method / Syllabus** | The teaching steps, and the units and chapters |
| **Teacher** | Name, quote, bio, credentials and photo (upload from your device) |
| **Facts strip** | The numbers under the headline |
| **Contact details** | Name, address, hours, map link, phone, WhatsApp, email |
| **Sections** | Turn each part of the home page on or off and edit its heading |
| **Enquiry form** | Pause requests, change the wording, the class and target choices, and the WhatsApp message |
| **Branding & SEO** | Logo letters, accent colour, footer, and the title and description used by Google |
| **Site status** | Close the site to visitors with a maintenance message |
| **Account & security** | Change the sign-in email and password, sign out other devices |
| **Activity log** | Who did what and when, including failed sign-in attempts |
| **Backup & restore** | Download everything as one file and restore it; download `content.json` for the GitHub Pages copy |

## Before going live: replace the placeholders

The dashboard's “Finish setting up” list links to each of these:

- the starter password
- the centre's phone number, street address and WhatsApp number
- the teacher's bio and photo
- at least one real student review (three hidden templates are waiting under Reviews; only publish real students, with permission)

## Deploy

One Docker container serves both the API and the built site:

```bash
docker build -t physics-bk .
docker run -d -p 8000:8000 -v physics-data:/data \
  -e SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')" \
  physics-bk
```

In production (`APP_ENV=production`, the Docker default) the server refuses to start if `SECRET_KEY` is left at its default. The SQLite database lives in the `/data` volume, so back that up (or use Backup & restore in the console).

This works on any host that runs Docker (Railway, Render, Fly.io, a VPS). `render.yaml` is a ready blueprint for Render's free plan with an external Postgres such as Neon; set `DATABASE_URL` there. Put the site behind HTTPS (the host usually does this for you) and point the domain at it.

Without Docker: run `npm run build` in `frontend/`, then run uvicorn from `backend/`. FastAPI serves `frontend/dist` automatically when it exists, and writes the current content and page title into the HTML so the first paint and search engines get the real text.

### The GitHub Pages copy

`.github/workflows/pages.yml` publishes a copy of the site as plain files on every push. GitHub Pages cannot run the server, so by default that copy:

- has **no console** and does not see changes made in a console elsewhere;
- shows the content in `frontend/public/content.json` (download a fresh one from the console under Backup & restore, replace the file, push);
- sends demo-class requests by opening WhatsApp or email instead of saving them.

To make the Pages copy live, host the server somewhere (for example Render), then add a repository variable named `API_URL` with its address (GitHub → Settings → Secrets and variables → Actions → Variables). The next build reads content from the server, saves enquiries to it and includes `/admin`. If the Pages address is not `https://thisissamirshaw.github.io`, also add it to `CORS_ORIGINS` on the server.

## API

| Method | Path | |
|---|---|---|
| GET | `/api/content` | Everything the homepage shows |
| POST | `/api/enquiries` | Demo-class request. Validates Indian mobile numbers and the choices set in the console, rate-limited to 5 per IP per 10 min, honeypot field against bots |
| GET | `/api/media/{id}` | An image uploaded from the console |
| POST | `/api/admin/login` | `{email, password}` → bearer token (12 h) |
| GET/PUT/POST | `/api/admin/me`, `/account/email`, `/account/password`, `/account/signout-all` | The super admin account |
| GET/POST/PATCH/DELETE | `/api/admin/enquiries[/{id}]` | `?status=new&q=text` filters, plus `/summary`, `/bulk` and `/export.csv` |
| CRUD | `/api/admin/programs`, `/batches`, `/testimonials` | plus `POST …/reorder` |
| GET/PUT | `/api/admin/settings` | Contact details, teacher, facts |
| GET/PUT | `/api/admin/page` | Page copy: hero, announcement, sections, method, syllabus, form, branding, SEO, status |
| GET | `/api/admin/stats`, `/activity` | Dashboard numbers and the activity log |
| GET/POST | `/api/admin/backup`, `/restore` | Full backup and restore |
| POST | `/api/admin/media` | Upload an image (JPEG, PNG or WebP, up to 1.5 MB) |
