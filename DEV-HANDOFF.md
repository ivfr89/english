# Language Duel — Handoff / Contexto del proyecto

Este documento resume el estado actual del proyecto, los cambios realizados en esta sesión y cómo retomarlo fácilmente más adelante. Está pensado como guía de continuidad para desarrollo y pruebas.

## Objetivo del juego

- 1v1 para practicar idiomas (Inglés/Español).
- Cada ronda: una ruleta elige Tema y Subtema, se genera un enunciado por jugador, cada uno responde, la IA evalúa y aplica daño al oponente.
- Gana quien reduce la vida del oponente a 0.

## Arranque rápido

- Dependencias: `npm install`
- Variables recomendadas (`.env` en la raíz; ya existe una plantilla):
  - `OPENROUTER_API_KEY=...` (ya configurada con tu clave limitada)
  - `OPENROUTER_MODEL=deepseek/deepseek-v3.2-exp`
  - `EVAL_MODE=openrouter` (usar IA real) o `mock` (offline)
  - `OPENROUTER_REFERRER=http://localhost`
  - `PROMPT_FALLBACK_MS=9000` (seguridad si IA no responde)
  - `DEBUG=1` (logs detallados)
  - Opcionales: `AUTO_SUBSPIN=1`, `AI_ASSIST_TIMEOUT_MS=8000`, `COOLDOWN_MS=30000`
- Ejecutar: `npm start` y abrir `http://localhost:3000` en dos pestañas.

## Integración IA (DeepSeek vía OpenRouter)

- Generación de enunciados: `server/lib/exercise.js` usa OpenRouter; si falla o expira, cae a `mockExercise()` tras `PROMPT_FALLBACK_MS`.
- Evaluación de respuestas: `server/lib/evaluator.js` (OpenRouter) o mock (heurístico) según `EVAL_MODE`.
- AI Assist (carta): `generateAIAnswer()` en `server/index.js` usa el modelo configurado para redactar una buena respuesta.

## Cambios clave realizados

1) “Waiting…” infinito solucionado
- Añadido “safety fallback” al generar enunciados: si la IA no responde en ~9s, se envía mock y se emite `prompts_ready`.
- Mensajería en cliente: muestra “Generando enunciado...” durante `playing` sin prompts para evitar confusión.

2) Flujo de ruleta (Tema → Subtema)
- Overlay de spinner ahora mantiene visible la segunda ruleta; antes se ocultaba tras el primer giro.
- Opcional: `AUTO_SUBSPIN=1` para girar subtema automáticamente si se desea.

3) Modo Cartas (nuevo)
- Se reparten cartas cada 3 rondas (ambos jugadores).
- Tipos implementados:
  - `heal_small` (Cura +10)
  - `shield_small` (Escudo +5) y `shield_medium` (Escudo +10)
  - `double_hit` (daño +50% esta ronda)
  - `silence` (el rival no puede usar cartas esta ronda)
  - `steal` (roba 1 carta aleatoria al rival)
  - `reroll_prompt` (regenera tu enunciado actual)
  - `ai_assist` (habilita botón “AI Assist” para autogenerar respuesta en tu textarea)
- Cálculo de daño actualizado: daño saliente aplica `double`, daño entrante resta `shield` del oponente.
- Bloqueos por ronda: `silenced` impide usar cartas durante la ronda actual.

4) UI mejorada y sin dependencia de CDNs
- Vendorización local (sin Internet):
  - Shim de componentes de UI estilo Shoelace: `web/vendor/sl-shim.css` y `web/vendor/sl-shim.js`.
  - Winwheel de ruleta (canvas) local: `web/vendor/winwheel-shim.js`.
  - Toasts locales: `web/vendor/toast.css` y `web/vendor/toast.js`.
- Ruleta responsive: se ajusta a viewport, HiDPI, separadores, hub central, textos truncados.
- Fallbacks: si no hay canvas, vuelve a ruleta CSS con segmentos; si no hay UI shim, conserva barras de vida clásicas.
- Botones y barras:
  - `sl-button` para acciones (Girar/Submit/AI Assist/Skip) — manejamos `disabled` como atributo y propiedad para coherencia visual.
  - `sl-progress-bar` (y fallback clásico) para vida.
- Cartas con iconos (emojis) y toasts en eventos importantes.

5) Correcciones de UX
- Overlay inicial (crear sala / unirse) con `z-index` alto para que nada interfiera al escribir o interactuar.
- Spinner overlay con altura máxima y ajuste dinámico del canvas para que el botón “Girar” sea visible desde el primer momento.

## Estructura y archivos tocados (principales)

- Servidor
  - `server/index.js`
    - Logs `DEBUG` para spins/round/prompts.
    - Fallback de prompts ante timeout.
    - Sistema de cartas (grant/use/effects), buffs por ronda y eventos WebSocket: `cards_granted`, `card_used`, `player_silenced`, `card_stolen`, `prompt_updated`, `ai_assist_ready`, `ai_answer`.
    - AI Assist (`generateAIAnswer`) usando OpenRouter.
  - `server/lib/exercise.js`
    - Export de `mockExercise` y fallback a mock.
  - `server/lib/evaluator.js`
    - Evaluación IA o mock según `EVAL_MODE`.

- Cliente (web)
  - `web/index.html`
    - Reemplazo de elementos por componentes estilizados (vía shim) y vendor scripts locales.
    - Canvas `#wheelCanvas` + fallback `.wheel`.
  - `web/main.js`
    - Detección de vendors; build y animación de ruleta; responsividad `ensureWheelSize()`.
    - Control estricto de `disabled` en botón “Girar” (propiedad + atributo) para ambos jugadores.
    - Cartas, toasts, AI Assist y mejoras de status.
  - `web/styles.css`
    - Estilos oscuros, spinner overlay con `max-height`, wheel CSS fallback y botones con mejor estructura.
  - `web/vendor/*` (todo local): `sl-shim.css/js`, `winwheel-shim.js`, `toast.css/js`.

- Otros
  - `.env` (presente localmente; `.gitignore` evita subirlo)
  - `.gitignore` ignora `.env`, `server.log`, `node_modules`.

## Eventos WebSocket relevantes

- Entrada
  - `create_room` | `join_room` | `state` | `spin` | `answer` | `skip`
  - Cartas: `use_card { cardId }`, `ai_answer_request`
- Salida
  - `state` (snapshot general)
  - `turn` (turno + temas/subtemas)
  - `spin_start` (índice, ángulo, rotaciones, stage)
  - `round_start` → `prompts_ready` → `evaluating` → `round_result` → `cooldown_start`
  - `game_over`, `opponent_disconnected`
  - Cartas: `cards_granted`, `card_used`, `player_silenced`, `card_stolen`, `prompt_updated`, `ai_assist_ready`, `ai_answer`

## Variables de entorno (resumen)

- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_REFERRER`
- `EVAL_MODE` = `openrouter` | `mock`
- `PROMPT_FALLBACK_MS` (p.ej. 9000)
- `AI_ASSIST_TIMEOUT_MS` (p.ej. 8000)
- `COOLDOWN_MS` (p.ej. 30000)
- `AUTO_SUBSPIN` (opcional)
- `DEBUG` = `1` para logs

## Debug y pruebas

- Ajustes de logs: `DEBUG=1` produce trazas con `[ws]`, `[spin]`, `[round]`, `[cards]`, `[ai]`.
- Prueba offline: `EVAL_MODE=mock` para evitar red.
- Si no aparecen prompts: revisar logs `[round] prompts_ready` o `safety_fallback`.
- Botón “Girar”:
  - Habilitado sólo para el jugador cuyo id coincide con `turn` del estado.
  - Se marca `disabled` en atributo y propiedad.

## Roadmap sugerido

- Más cartas: escudo visible, doble golpe x2, bloquear IA del rival, etc.
- Iconos SVG locales (reemplazar emojis cuando sea necesario).
- Toasts agrupados y persistentes (historial ligero).
- Mejoras de accesibilidad (atajos de teclado: G para “Girar”, S para “Skip”, etc.).
- Tema visual personalizable (variables CSS centralizadas).

## Notas de seguridad

- `.env` se mantiene fuera de git por `.gitignore`. Aunque la clave actual es “limitada”, no se recomienda subirla a repos públicos.

---

Si retomas el proyecto y algo no encaja (ruleta gigante o botón “Girar” deshabilitado), revisa primero:
- Que `setTurn` está disparando (ver overlay y logs `[room] ready_for_spin`).
- Que `ensureWheelSize()` se ejecute (ver `web/main.js`).
- Que las variables en `.env` están como esperas.

Cualquier duda futura, retomo desde aquí sin perder contexto.
