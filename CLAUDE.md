# CLAUDE.md

Working notes for AI assistants helping on this repo.

## What this is

splitjar is a single-container, no-auth expense-sharing app. FastAPI + SQLite on the back, React + Vite + Tailwind on the front, bundled together in one multi-stage Docker image.

## Constraints to respect

- **No auth, ever.** It's a deliberate trade-off — see [SECURITY.md](SECURITY.md). Don't propose adding it; suggest "put a reverse proxy in front" instead.
- **One container.** Don't split into multiple services. The frontend gets built in stage 1 and served as static files by FastAPI in the runtime stage.
- **No multi-currency conversion.** Currency is a per-group string, displayed via `Intl.NumberFormat`. Don't pull in conversion APIs.
- **SQLite only.** No Postgres support. WAL mode is on; `/data` is the only writable volume.
- **No formal migrations yet** — schema is created via `SQLModel.metadata.create_all` at startup. If you change models, plan an Alembic introduction in the same PR.

## Where things live

- Backend entrypoint: `backend/app/main.py` — factory, CSP middleware, SPA fallback.
- Formula evaluator: `backend/app/services/formula.py` — AST-walking, whitelisted tokens, no `eval`.
- Settlement algorithm: `backend/app/services/balances.py` — greedy minimal transfers.
- Frontend tabs: `frontend/src/pages/ExpensesTab.tsx`, `StatsTab.tsx`, `SettingsTab.tsx`.

## Testing

```bash
docker build --target test -t splitjar-test .
docker run --rm splitjar-test
```

## Common pitfalls

- The frontend formula parser uses `new Function()` and the backend uses AST walking. They should agree on the same whitelist `[\d.+\-*/()\s]`. If you change one, change the other.
- `frame-ancestors` is read from `SPLITJAR_FRAME_ANCESTORS` — single space-separated string. Don't quote inner values in `.env`.
- Decimals: backend stores `Decimal(12,2)` and serializes as strings. Don't `parseFloat` server-side; do it only at the display layer.
