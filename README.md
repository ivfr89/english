# Language Duel

1v1 online game to practice English and Spanish. Each round, both players receive a prompt in the language they are learning. They submit answers, an evaluator scores them (OpenRouter + DeepSeek or a local mock), and the score translates into damage to the opponent's life. First to reduce the opponent to 0 wins.

## Features

- 2-player rooms via WebSockets
- Split-screen UI (your prompt/feedback vs opponent's)
- Turn-based spinner that selects a topic (Complete phrase, Translate, Short writing, Vocabulary, Roleplay, Fill blanks). Both players see the animated spin in sync. Topics are shown in each player’s native language.
- Exercise types are generated per topic via OpenRouter (DeepSeek) or a mock fallback.
- Complex prompts: frequent multi-turn scenarios (dialogue, forum thread, podcast transcript) with an explicit, longer Context section. Each prompt includes 1–2 ideal answers revealed after scoring to reinforce learning.
- Per-player CEFR level (A1–C2): each player chooses their level; prompt complexity and evaluation expectations adapt to that level in both single and multiplayer.
- 30s review cooldown between rounds to read feedback; both players can press Skip to end cooldown early and return to the spinner.
- AI evaluation (OpenRouter + DeepSeek) or offline mock
  - Rubric includes Context Adherence to reward on-topic, consistent answers.

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

Tip: In the home screen, choose your Learning language, Native language, and CEFR Level. The game tailors prompt length/vocabulary and evaluation strictness to your level.

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

## Notas de Desarrollo (resumen cambios recientes)

- Estabilidad UI en escritorio y móvil
  - Reestructurado el panel izquierdo con `panel-body` desplazable y barra de envío fija para evitar solapes entre prompt, botones y textarea.
  - Eliminadas animaciones con transform que causaban solapes en rondas siguientes; sin “fade” que mueva layout.
  - Corrección de “doble submit” removiendo el `onclick` inline y quedando un único handler JS.

- Generación de prompts (IA‑only) y variedad
  - Eliminado el modo mock: la generación y la evaluación se hacen solo vía OpenRouter. En caso de fallo, se muestra error y puede reintentarse; no hay contenido de relleno.
  - Ampliados temas: además de trabajo/atención cliente/viajes/amistad/entrevista/negociación, se añadieron salud, educación, tecnología, compras, deportes, entretenimiento, familia, vida diaria, comida/cocina y finanzas (con subtemas EN/ES).
  - Prompts más largos con “Context” rico en la lengua nativa del jugador y conversación multi‑turno (diálogo/foro/podcast). Cada prompt incluye 1–2 “Ideal answers” que se muestran tras evaluar.
  - Sanitización del prompt: se mantiene toda la conversación, pero si la IA rellena la línea del alumno (Guest/B/@Tú), se normaliza a “(continue with your answer)” para que no venga la respuesta “puesta”.

- Single‑player mejorado
  - Solo P1 usa IA para el prompt (no hay bot). AI Assist queda habilitado por defecto en cada ronda.
  - Elección directa de tema/subtema: en modo single, los ítems de la leyenda funcionan como chips clicables. Puedes elegir tema (stage=topic) y luego subtema (stage=subtopic), o seguir usando la ruleta.

- Evaluación y feedback
  - La rúbrica pondera “Context Adherence”. El feedback del jugador incluye “Ideal answers”.
  - Historial y progreso muestran: enunciado, tu respuesta, feedback/correcciones e “Ideal answers”.

- Tiempos y timeouts
  - Generación: `GEN_TIMEOUT_MS` por defecto 180s, `GEN_RETRIES` 3 (con reintentos cortos). “Soft timeout”: si tarda, no vuelve a la ruleta; se avisa y se espera el resultado.
  - Evaluación: `EVAL_TIMEOUT_MS` por defecto 60s.
  - AI Assist/Explicación: `AI_ASSIST_TIMEOUT_MS` por defecto 60s.
  - Enfriamiento entre rondas: `COOLDOWN_MS` por defecto 180s (configurable).
  - Indicador en UI: en el footer se muestra “(IA 850ms)” al llegar el enunciado.

### Uso rápido (single‑player con chips)
- Tras la ruleta, puedes:
  - Hacer clic en un tema de la leyenda (chips) para seleccionar tema.
  - Luego, clic en un subtema (chips) para generar la ronda.
  - O pulsar “Girar” si prefieres aleatorio.

## UI Notes

- The answer submit bar stays sticky at the bottom of the left panel to prevent overlaps as content grows between rounds.
- Prompt actions (Guardar nota / Entender) are grouped in a single toolbar inside the prompt box; on mobile they wrap gracefully.
- Panels are scrollable when content exceeds the viewport, keeping controls accessible.
