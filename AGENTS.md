# Repository Guidelines

## Project Structure & Module Organization
- Server: `server/index.js` (Express + WebSocket). Helpers in `server/lib/` (`evaluator.js`, `exercise.js`, `store.js`).
- Client: static assets in `web/` (`index.html`, `main.js`, `styles.css`, `vendor/`).
- Config: `.env` (local), `.env.example` (template), `render.yaml` (deploy), `README.md` (usage).
- Entry point: `npm start` runs `server/index.js` and serves `web/`.

## Build, Test, and Development Commands
- Install: `npm install` — installs server dependencies.
- Run (mock eval): `npm start` — starts server at `http://localhost:3000`.
- Run (real eval): set `.env` with `OPENROUTER_API_KEY` and `EVAL_MODE=openrouter`, then `npm start`.
- Quick single‑player: `AUTO_BOT=1 npm start` (bot joins as P2 for local testing).

## Coding Style & Naming Conventions
- JavaScript (ES Modules, Node 18+): 2‑space indentation; use semicolons; prefer single quotes; trailing commas sparingly.
- Naming: camelCase for variables/functions; PascalCase for classes; UPPER_SNAKE_CASE for constants and env keys.
- File layout: keep server utilities in `server/lib/`; client code in `web/`. Small, focused modules.
- Imports: relative paths with `.js` extension (e.g., `import { createEvaluator } from './lib/evaluator.js'`).

## Testing Guidelines
- No automated tests yet. For now, validate by running locally and exercising flows:
  - Health: GET `http://localhost:3000/healthz` → `{ ok: true }`.
  - Multiplayer: open two tabs, create/join room, submit answers.
  - Single‑player: set `AUTO_BOT=1` and verify round flow and cooldown.
- When adding tests, prefer `server/__tests__/*.test.js` and aim to cover evaluator fallbacks and room lifecycle.

## Commit & Pull Request Guidelines
- Commits: concise, imperative subject (≤72 chars), e.g., “Fix spinner subtopic timing”. Include brief body when needed.
- Link issues in bodies (e.g., “Refs #12”).
- PRs: include purpose, key changes, manual test steps, env vars touched, and screenshots/GIFs for UI changes. Keep diffs focused.

## Security & Configuration Tips
- Never commit secrets. Use `.env` (ignored) and mirror keys in `.env.example` without values.
- Important env vars: `OPENROUTER_API_KEY`, `EVAL_MODE` (`mock` or `openrouter`), `OPENROUTER_MODEL`, `PROMPT_FALLBACK_MS`, `COOLDOWN_MS`, `DEBUG`, optional `DATABASE_URL` (Postgres).
- Offline/dev friendly: evaluator and exercise generation gracefully fallback to mock modes.
