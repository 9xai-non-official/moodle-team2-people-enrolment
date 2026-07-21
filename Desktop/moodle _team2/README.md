# Moodle Replica

Skeleton for a Moodle-like people & enrolment app.

- **`backend/`** — FastAPI API skeleton (users, courses, enrolment, roles, groups).
- **`frontend/`** — React + Vite blank shell (header, sidebar, content area) ready for components.

## Run locally

Two terminals.

### Backend (http://localhost:8010)

```bash
cd backend
./.venv/bin/uvicorn main:app --reload --port 8010
```

API docs at http://localhost:8010/docs

### Frontend (http://localhost:5173)

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 — the header shows an **API: online** indicator when the
backend is reachable.

## Layout

```
moodle-replica/
├── backend/
│   ├── main.py              # FastAPI app + CORS + router wiring
│   ├── requirements.txt
│   └── app/
│       ├── schemas.py       # Pydantic models
│       └── routers/         # users, courses, enrolment, roles, groups (stubs)
└── frontend/
    └── src/
        ├── App.jsx          # blank shell + API health check
        ├── api.js           # fetch helper
        └── App.css
```

Everything is a stub returning placeholder data — wire in a real database and
component logic next.
