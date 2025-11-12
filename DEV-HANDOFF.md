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
    - Single Player (umbral y daño), Playground, Favoritos, Progreso (historial + playground logs), Diccionario contextual.
    - Persistencia opcional con Neon vía `DATABASE_URL` (favorites/history/playground_logs).
  - `server/lib/exercise.js`
    - Export de `mockExercise` y fallback a mock.
    - `getHints(topic, subtopic, nativeLanguage)` para pistas.
  - `server/lib/evaluator.js`
    - Evaluación IA o mock según `EVAL_MODE`.
    - Parseo robusto de JSON y rúbrica con penalizaciones comunes.
  - `server/lib/store.js`
    - Store Postgres (pg): `favorites`, `history`, `playground_logs` con inicialización e índices.

- Cliente (web)
  - `web/index.html`
    - Reemplazo de elementos por componentes estilizados (vía shim) y vendor scripts locales.
    - Canvas `#wheelCanvas` + fallback `.wheel`.
    - Botones: Single Player (con umbral), Diccionario contextual (popup en tu prompt), Playground (desktop/mobile), Progreso en Playground, Guardar nota.
  - `web/main.js`
    - Detección de vendors; build y animación de ruleta; responsividad `ensureWheelSize()`.
    - Control estricto de `disabled` en botón “Girar” (propiedad + atributo) para ambos jugadores.
    - Cartas, toasts, AI Assist y mejoras de status.
    - Single Player, Playground, Favoritos, Progreso, Diccionario contextual.
  - `web/styles.css`
    - Estilos oscuros, spinner overlay con `max-height`, wheel CSS fallback y botones con mejor estructura.
    - Ruleta y tipografía adaptadas en móvil; layout de Playground responsive (columnas → stack en ≤700px).
  - `web/vendor/*` (todo local): `sl-shim.css/js`, `winwheel-shim.js`, `toast.css/js`.

- Otros
  - `.env` (presente localmente; `.gitignore` evita subirlo)
  - `.gitignore` ignora `.env`, `server.log`, `node_modules`.

## Eventos WebSocket relevantes

- Entrada
  - `create_room` | `join_room` | `state` | `spin` | `answer` | `skip`
  - Cartas: `use_card { cardId }`, `ai_answer_request`
  - Diccionario: `explain_selection { text, context, nativeLanguage }`
  - Single/Playground: `single_start { threshold }`, `enter_playground`, `playground_more`, `playground_submit { answers }`, `playground_progress`, `exit_playground`
  - Favoritos: `add_favorite_note { text }`, `list_favorites`, `delete_favorite_note { id }`, `start_playground_note { id }`
- Salida
  - `state` (snapshot general)
  - `turn` (turno + temas/subtemas)
  - `spin_start` (índice, ángulo, rotaciones, stage)
  - `round_start` → `prompts_ready` → `evaluating` → `round_result` → `cooldown_start`
  - `game_over`, `opponent_disconnected`
  - Cartas: `cards_granted`, `card_used`, `player_silenced`, `card_stolen`, `prompt_updated`, `ai_assist_ready`, `ai_answer`
  - Diccionario: `explain_result { text, explanation }`
  - Playground/Favoritos: `playground_ready { exercises }`, `playground_feedback { results }`, `favorites { items }`, `progress_data { history, playground }`

## Variables de entorno (resumen)

- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_REFERRER`
- `EVAL_MODE` = `openrouter` | `mock`
- `PROMPT_FALLBACK_MS` (p.ej. 9000)
- `AI_ASSIST_TIMEOUT_MS` (p.ej. 8000)
- `COOLDOWN_MS` (p.ej. 30000)
- `AUTO_SUBSPIN` (opcional)
- `DEBUG` = `1` para logs
 - `DATABASE_URL` (opcional; Postgres Neon para persistencia de favoritos/historial/playground)

## Deploy en Render (blueprint incluido)

- Archivo `render.yaml` añade un servicio Node (free) con healthcheck `/healthz`.
- Env vars mínimas:
  - `OPENROUTER_API_KEY` (si usas IA real) y `OPENROUTER_REFERRER=https://<tu-app>.onrender.com`.
  - `EVAL_MODE=openrouter` (o `mock` sin red)
  - `DATABASE_URL` (Neon Postgres) para persistencia — si se omite, hay fallback en memoria.

## UX móvil

- Ruleta más pequeña y textos adaptativos.
- En multi, botón para alternar vista “Ver oponente / Ver tu vista” en ≤700px.
- Playground responsive: columnas → stack, overlay con scroll y botones visibles.

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
6) Evaluador más consistente y tolerante
- El evaluador ahora acepta JSON con fences o texto extra (intenta extraer el objeto). Si falla el parseo o la llamada, hace fallback a un heurístico justo (no 0 salvo respuesta vacía) y añade nota en feedback.
- Se definió rúbrica con pesos: Gramática/Ortografía (40), Colocaciones (20), Coherencia/Fluidez (20), Cumplimiento/Tono (20). Penalizaciones típicas: “buy to you” → “buy you…”, “neccesary” → “necessary”, capitalización de “I”, etc.

7) Single Player (nuevo) con supervivencia
- Botón “Single Player” en overlay inicial. Se define un umbral (p. ej. 70). Por cada ronda: si tu score < umbral, pierdes 10 de vida. Objetivo: sobrevivir lo máximo.
- Flujo de ruleta se mantiene (Tema → Subtema). Siempre tu turno. Panel del oponente oculto en single y, en móvil, alternancia de vistas en multi.
- Spinner y overlay adaptados a móvil (ruleta y tipografía más pequeñas), botón para alternar vista del oponente en ≤700px.

8) Pistas nativas y diccionario contextual
- Pistas (hints) en el idioma nativo del jugador bajo su prompt.
- Diccionario: selecciona texto en tu prompt → botón “Entender” → explicación en nativo, sinónimos y ejemplo de uso en el idioma que aprendes. Incluye loader y panel discreto.

9) Playground (single-player)
- Botón “Ir a playground” (desktop y móvil). Pausa la partida y abre overlay con ejercicios propuestos según debilidades detectadas en tu historial reciente (preposiciones, ortografía, capitalización, artículos, tiempos, fluidez).
- Acciones: “Enviar” (evalúa y da feedback), “Más ejercicios” (regenera según debilidades o nota), “Salir del playground” (reanuda partida). Soporta salir con Esc y el overlay es scrollable.
- Progreso: botón “Ver progreso” muestra historial reciente de rondas y ejercicios de Playground.

10) Favoritos / Notas de estudio (nuevo)
- “⭐ Guardar nota” bajo el prompt (guarda selección o prompt completo). En el Playground puedes añadir notas manuales en “Favoritos”.
- Desde “Favoritos” puedes “Practicar” (genera ejercicios basados en la nota) o “Eliminar”.

11) Persistencia con Neon (Postgres) + fallback en memoria
- Tabla `favorites`: notas de estudio (id, room_code, player_id, text, created_at).
- Tabla `history`: historial de rondas (prompt, answer, score, feedback, corrections, language, round, timestamps).
- Tabla `playground_logs`: resultados de ejercicios de Playground.
- Si `DATABASE_URL` está configurada, se persiste en Neon; si no, se usa almacenamiento en memoria por sala.

## Resumen de la sesión (guardado)

Fecha: 2025-11-12

- Login con Google
  - Gate inicial que exige login y muestra avatar/nombre, “Cambiar de cuenta” y “Cerrar sesión”.
  - Endpoints `/auth/google`, `/auth/me`, `/auth/logout`; cookie HttpOnly. Diagnóstico visible si el botón falla (origen no permitido/Client ID).

- Playground y flujo
  - Arreglado “cerrar y reabrir”: servidor ignora reentradas y sale a `waiting_spin`; cliente ignora `playground_ready` rezagados.
  - Botones clave migrados a HTML nativo con handlers explícitos: Enviar (con loader), Más ejercicios, Salir, Añadir a favoritos. Salir funciona incluso durante evaluación.
  - Overlays en header: “⭐ Favoritos” y “📈 Progreso”.

- Persistencia por usuario
  - `favorites`, `history` y `playground_logs` guardan `user_id` (Google). Fallback a datos “legados” por sala/jugador al listar favoritos. Migraciones automáticas en arranque.

- Your Prompt y móvil
  - Submit robusto (botón nativo + handler); “⭐ Guardar nota” estable.
  - Botón “💡 Entender”: en desktop usa selección; en Android/iOS ofrece input inline si no hay selección (evita el menú del sistema) y muestra el panel de explicación.

- Notas técnicas
  - Reubicadas referencias dentro del IIFE de `web/main.js` para evitar errores “before initialization”.
  - Reemplazo de `sl-button` por `<button>` en acciones críticas para evitar quirks del shim.

- Próximos pasos sugeridos
  - Badge de conteo en “⭐ Favoritos”; filtros por idioma/fecha en “📈 Progreso”.
  - Opción de migrar favoritos legados a `user_id` al iniciar sesión.
