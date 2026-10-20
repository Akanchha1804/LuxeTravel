# LuxeTravel: AI Trip Planner

A full-stack trip planner: a React single-page app backed by Django REST
Framework. It builds day-by-day itineraries (AI-generated when a key is
configured, otherwise a curated plan), visualises destinations, saves and
shares trips, and includes trip chatrooms plus flight/hotel search.

The React build is served by Django, so production is **one service on one
port**. A split dev setup (`npm start` + `runserver`) is still supported.

---

## Quick start (production-like, single server)

Prerequisites: **Python 3.12+**, **Node.js 18+**, npm, and Git.

On Windows (PowerShell), from the repository root:

```powershell
.\start-live.ps1 -Build
```

Then open <http://localhost:8000>.

The script creates `.venv`, installs `backend/requirements.txt`, builds the
React app, runs migrations/collectstatic, and starts Waitress with
`DEBUG=False`. On macOS/Linux use the equivalent:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
npm ci && npm run build
cd backend
export DEBUG=False
export SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(50))')"
python manage.py migrate --noinput
python manage.py collectstatic --noinput
python -m waitress --listen=0.0.0.0:8000 --threads=8 trip_planner.wsgi:application
```

> `SECRET_KEY` is required whenever `DEBUG=False`. Copy
> `backend/.env.example` to `backend/.env` for a persistent local setup.

---

## Development mode (two servers, hot reload)

1. **Backend** — from `backend/`:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```
   API at <http://localhost:8000>.

2. **Frontend** — from the repository root:
   ```bash
   npm install
   npm start
   ```
   App at <http://localhost:3000>. Create React App proxies `/api` to
   `http://localhost:8000` (see `"proxy"` in `package.json`), so no CORS
   configuration is needed locally.

---

## Environment variables

Copy `backend/.env.example` to `backend/.env`. Only the first two matter for a
basic run; everything else is optional.

| Variable | Purpose |
| --- | --- |
| `DEBUG` | `True` for development, `False` for production (default `False`). |
| `SECRET_KEY` | Required when `DEBUG=False`. |
| `ALLOWED_HOSTS` | Comma-separated hostnames, e.g. `localhost,127.0.0.1`. |
| `CSRF_TRUSTED_ORIGINS` | Comma-separated HTTPS origins for admin/CSRF. |
| `DATABASE_URL` | Postgres connection URL; overrides the `DB_*` variables. |
| `DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | Alternative Postgres configuration. |
| `SQLITE_PATH` | Override the default SQLite file (`backend/db.sqlite3`). |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Optional AI itinerary provider. |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional AI provider (used if OpenAI is absent). |
| `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, `AMADEUS_ENV` | Optional live flight/hotel search. |
| `THROTTLE_ANON`, `THROTTLE_USER`, `THROTTLE_AI` | DRF rate limits (defaults `120/min`, `600/min`, `10/min`). |
| `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_HSTS_SECONDS` | HTTPS hardening; enable behind TLS. |

The frontend only reads `REACT_APP_API_URL` (see `.env.example`). Leave it
empty for single-service deployment; set it to a full URL only when the React
app is hosted separately.

**Secrets never belong in frontend variables.** Amadeus and AI keys are read
server-side only.

### Graceful degradation

- No AI key → `/api/trips/preview/` returns `503` and the UI shows a curated
  itinerary for the destination. Nothing breaks.
- No Amadeus key → booking search returns sample flights/hotels and labels
  them as offline results.
- No Postgres → SQLite is used automatically.

---

## Tests

```bash
cd backend
python manage.py test
```

The API suite covers auth, trip ownership, budget/date validation, sharing,
forking, chat access, health, and admin-only activity reads.

There is no frontend test suite yet. The Create React App/Jest runner is
available if you add one:

```bash
npm test -- --watchAll=false
```

---

## API overview

All endpoints are under `/api/`. Authentication uses DRF token auth:
`Authorization: Token <key>`.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/health/` | Public status, DB check, configured providers. |
| `POST` | `/signup/`, `/login/`, `/logout/` | Token auth lifecycle. |
| `GET` | `/me/` | Current user. |
| `GET/POST` | `/trips/` | List/create the current user's trips. |
| `GET/PATCH/DELETE` | `/trips/:id/` | Owner-only. |
| `POST` | `/trips/preview/` | Stateless AI itinerary preview (no save). |
| `POST` | `/trips/:id/make-public/` | Creates/returns a share link. |
| `POST` | `/trips/:id/create-chatroom/` | Creates/returns the trip's room. |
| `GET` | `/shared/:code/` | Public shared-trip view. |
| `POST` | `/shared/:code/fork/` | Copy a shared trip into your account. |
| `GET/POST` | `/chatrooms/`, `/chatrooms/:id/messages/` | Public or code-protected rooms. |
| `GET` | `/travel/flights/`, `/travel/hotels/` | Server-side Amadeus proxy with sample fallback. |
| `GET` | `/destinations/` | Read-only destination catalogue. |
| `GET` | `/user-activities/` | Admin only. |

Private chatrooms require the `X-Room-Code` header; messages are only readable
by clients that present the room code (or the room owner).

---

## Project structure

```
.
├── src/                     React app (pages, components, services/api.js)
├── public/                  CRA HTML shell
├── backend/
│   ├── trip_planner/        Django settings, URLs, WSGI/ASGI
│   ├── trips/               Models, views, serializers, AI + Amadeus helpers, tests
│   ├── requirements.txt
│   └── .env.example
├── build/                   Generated React production build (served by Django)
├── start-live.ps1           Windows production-like runner
├── build.sh                 Render/Railway build script
├── Dockerfile               Multi-stage Node + Python image
├── Procfile                 Gunicorn process definition
└── render.yaml              Render blueprint (web service + Postgres)
```

`docs/` keeps development history and historical notes.

---

## Deployment

### Docker

```bash
docker build -t luxetravel .
docker run -p 8000:8000 \
  -e SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(50))')" \
  -e ALLOWED_HOSTS=localhost,127.0.0.1 \
  luxetravel
```

The image builds the React app, collects static files, runs migrations on
start, and serves everything with Gunicorn on `$PORT` (default `8000`).

### Render

`render.yaml` provisions a Python web service plus Postgres. It runs
`build.sh`, starts Gunicorn, health-checks `/api/health/`, generates
`SECRET_KEY`, and enables HTTPS redirects. Add AI/Amadeus keys in the Render
dashboard (they are marked `sync: false`).

For any other host: run `build.sh` during the build phase, then start
`gunicorn trip_planner.wsgi:application` from `backend/`, with `DEBUG=False`
and a real `SECRET_KEY`.

---

## Notes

- SQLite is the zero-config default. For concurrent production traffic, set
  `DATABASE_URL` to Postgres.
- Static files are fingerprinted and compressed by WhiteNoise.
- CORS is disabled in production unless `CORS_ALLOWED_ORIGINS` is set; the
  single-service deployment does not need it.
