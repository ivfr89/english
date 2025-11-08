# Language Duel

1v1 online game to practice English and Spanish. Each round, both players receive a prompt in the language they are learning. They submit answers, an evaluator scores them (OpenRouter + DeepSeek or a local mock), and the score translates into damage to the opponent's life. First to reduce the opponent to 0 wins.

## Features

- 2-player rooms via WebSockets
- Split-screen UI (your prompt/feedback vs opponent's)
- Turn-based spinner that selects a topic (Complete phrase, Translate, Short writing, Vocabulary, Roleplay, Fill blanks). Both players see the animated spin in sync. Topics are shown in each player’s native language.
- Exercise types are generated per topic via OpenRouter (DeepSeek) or a mock fallback.
- 30s review cooldown between rounds to read feedback; both players can press Skip to end cooldown early and return to the spinner.
- AI evaluation (OpenRouter + DeepSeek) or offline mock

## Tech

- Node.js + Express server (`server/index.js`)
- `ws` for WebSocket realtime
- Static web client in `web/`

## Quick Start (Local)

1. Install dependencies:

   npm install

2. (Optional) Create a `.env` file to enable real AI evaluation:

   OPENROUTER_API_KEY=sk-or-...
   OPENROUTER_MODEL=deepseek/deepseek-r1
   OPENROUTER_REFERRER=http://localhost
   EVAL_MODE=openrouter
   COOLDOWN_MS=30000
   # Optional: single-player mode
   AUTO_BOT=1

Without these, the server falls back to a built-in mock evaluator.

3. Run the server:

   npm start

4. Open the game in a browser: http://localhost:3000

5. Create a room, share the room code with your friend, and play.

### Single-player (AUTO_BOT)

If you set `AUTO_BOT=1`, the server auto-joins a bot as Player 2 when you create a room. The bot will:
- Spin the wheel on its turn (topic and subtopic)
- Submit a simple answer after prompts are generated

This lets you test the full flow alone without a second device.

## How It Works

- Rooms: The server creates a 4-character room code and holds up to 2 players.
- Rounds: When both players are connected, each round starts with a prompt per player (based on the language they chose to learn). Both submit answers. Once both answers arrive, the evaluator scores each (0–100). Damage = score/5 (0–20). The opponent's life is reduced accordingly.
- Cooldown: After each round, there is a short review period (default 30s) to read feedback. If both players press Skip, the spinner resumes immediately.
- End: If a player's life reaches 0, the match ends and a winner is announced.

## Evaluator Integration

The evaluator module is in `server/lib/evaluator.js`.

- Mock mode (default): Simple heuristic scoring; no network needed.
- OpenRouter mode: Set environment variables listed above. The server will call `https://openrouter.ai/api/v1/chat/completions` with your DeepSeek model (defaults to `deepseek/deepseek-chat-v3.1:free`).

Notes:
- Ensure your OpenRouter account has access to the specified DeepSeek model.
- You can tune the scoring or the prompt engineering in `evaluator.js`.

## Exercise Generation

See `server/lib/exercise.js`. The spinner selects a conversational topic (work conversation, customer support, travel conversation, friend chat, interview, negotiation). For each player, the app generates a short scenario and a partner line (A: ...) and asks the learner to reply as B with 2–4 lines in the target language.

## Deploying

This app uses WebSockets. Choose a host that supports long-lived WebSocket connections (e.g., Fly.io, Railway, Render, a basic VM). Typical steps:

- Set `PORT` env var as required by your platform
- Provide `.env` with your OpenRouter key
- Run `node server/index.js`

## Roadmap

- Timers per round and AFK handling
- Ranking and ELO per player
- Per-skill modes (grammar-only, vocabulary-only)
- Spectator mode and replays
