# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend
```bash
# Run with auto-reload (development)
uvicorn backend.main:app --reload --port 8000

# Or use the convenience script (uses Anaconda fastapi env)
./start_server.sh

# Install Python dependencies
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend

npm install          # Install dependencies
npm run dev          # Vite dev server (proxies API to :8000)
npm run build        # Build to frontend/dist/ (served by FastAPI)
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
npm run test         # Vitest (watch mode)
npm run test:run     # Vitest (single run)
npm run check        # typecheck + lint + test:run (full CI check)
```

## Architecture

### Backend (FastAPI + PostgreSQL)

`backend/main.py` is the single entrypoint. It owns:
- **In-memory cache** (`_cache` dict) with 5-minute TTL and stale-while-revalidate pattern — all `/api/topics` reads hit this first
- **Source orchestration** — runs all scrapers in parallel via `asyncio.gather`, each with 8s independent timeout
- **JWT auth** — soft auth (`get_current_user` returns `None` instead of raising) for most endpoints; hard auth only for `/api/chat` and session management
- **Startup preload** — `_preload_cache()` fires as a background task on lifespan startup

**Data flow**: Sources → `_cache["topics"]` → PostgreSQL (persisted after each refresh) → API responses

`backend/sources/` — each source extends `BaseSource` (abstract `fetch() -> list[dict]`). Returns dicts with keys: `title`, `url`, `hot_value`, `rank`, `category`. Twitter and Reddit sources exist but are commented out in `SOURCES`.

`backend/ai_service.py` — all DeepSeek calls. Uses OpenAI SDK pointed at `https://api.deepseek.com`. The chat function does smart DDG web search routing (parallel searches for mixed Chinese/English queries) before calling the LLM.

`backend/database.py` — PostgreSQL via `asyncpg` connection pool. Tables: `hot_topics`, `ai_analyses`, `users`, `user_likes`, `user_keywords`, `personal_articles`, `chat_sessions`, `chat_messages`.

### Frontend (TypeScript + Vite, no framework)

The new frontend (`frontend/src/`) follows **Feature-Sliced Design**:
- `src/features/` — self-contained features: `topics`, `auth`, `analysis`, `chat`, `preferences`, `feed`, `recommendations`, `notifications`. Each feature has `.api.ts` (HTTP calls), `.store.ts` (reactive state), `.service.ts` (orchestration), `.types.ts`.
- `src/shared/` — `lib/` (fetcher, store primitive, event-bus, SSE), `components/` (toast, modal, pagination, empty-state), `styles/` (CSS tokens + base), `config/` (env, constants).
- `src/pages/` — page-level view wiring: `hot-feed`, `mine`.
- `src/legacy/` — old monolithic `legacy-app.ts` kept for reference; `frontend/legacy-index.html` serves it.

FastAPI serves the built frontend: `frontend/dist/index.html` at `/`, assets at `/assets/`.

### Environment Variables

Required in `.env`:
- `DEEPSEEK_API_KEY` — DeepSeek API key
- `DATABASE_URL` — PostgreSQL connection string (`postgresql://user:pass@host:5432/db`)
- `JWT_SECRET` — JWT signing secret (default `changeme-please-set-in-env` is insecure)

### Key Constraints

- **Max 2 registered users** — hardcoded limit; registration returns 403 once 2 users exist
- **First registered user** inherits any pre-existing anonymous preference data via `migrate_preferences_to_user`
- **Cache is process-local** — no Redis; restarts lose the in-memory cache (DB still holds history)
- The `data/hotresearch.db` SQLite file is a leftover artifact; the live DB is PostgreSQL
