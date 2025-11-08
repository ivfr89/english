import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { createEvaluator } from './lib/evaluator.js';
import { createExerciseGenerator, getSubtopics, TOPICS, mockExercise } from './lib/exercise.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true';
const AUTO_SUBSPIN = process.env.AUTO_SUBSPIN === '1' || process.env.AUTO_SUBSPIN === 'true';
const log = (...args) => { if (DEBUG) console.log(new Date().toISOString(), ...args); };

// --- Card system ---
const CARD_TYPES = [
  { type: 'heal_small', label: 'Cura (+10)', description: 'Cura ligeramente tu vida.', useDuring: 'any' },
  { type: 'reroll_prompt', label: 'Cambiar pregunta', description: 'Cambia tu enunciado actual.', useDuring: 'playing' },
  { type: 'ai_assist', label: 'Respuesta IA', description: 'Habilita ayuda IA para este turno.', useDuring: 'playing' },
];

function randomCard() {
  const idx = Math.floor(Math.random() * CARD_TYPES.length);
  const base = CARD_TYPES[idx];
  return { id: `c_${Math.random().toString(36).slice(2, 8)}`, ...base };
}

// Serve static client
app.use(express.static(path.join(__dirname, '../web')));

// Basic health route
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// ---- Game state ----
const rooms = new Map();
const evaluator = createEvaluator();
const exerciseGen = createExerciseGenerator();

const AUTO_BOT = process.env.AUTO_BOT === '1' || process.env.AUTO_BOT === 'true';

function hasBot(room) {
  return Object.values(room.players || {}).some((p) => p && p.isBot);
}

function getBot(room) {
  return Object.values(room.players || {}).find((p) => p && p.isBot) || null;
}

function schedule(fn, ms = 600) {
  return setTimeout(() => {
    try { fn(); } catch { /* noop */ }
  }, ms);
}

function simulateSpinTopic(room) {
  if (!room) return;
  log('[spin] topic start', { room: room.code });
  const list = TOPICS;
  if (!Array.isArray(list) || list.length === 0) return;
  const idx = Math.floor(Math.random() * list.length);
  const topic = list[idx];
  room.status = 'spinning';
  const rotations = 5;
  const sliceAngle = 360 / list.length;
  const finalAngle = 360 - (idx * sliceAngle + sliceAngle / 2);
  broadcastRoom(room, { type: 'spin_start', index: idx, topicKey: topic.key, rotations, finalAngle, topics: list, stage: 'topic' });
  setTimeout(() => {
    room.lastCategory = topic.key;
    room.status = 'waiting_subspin';
    room.stage = 'subtopic';
    log('[spin] topic selected', { room: room.code, topic: topic.key });
    const subs = getSubtopics(topic.key);
    broadcastRoom(room, { type: 'turn', playerId: room.turn, topics: subs, stage: 'subtopic' });
    broadcastRoom(room, roomSnapshot(room));
    // If still bot's turn or AUTO_SUBSPIN, auto spin subtopic shortly
    if ((hasBot(room) && room.turn === 'p2') || AUTO_SUBSPIN) schedule(() => simulateSpinSubtopic(room), 700);
  }, 2200);
}

function simulateSpinSubtopic(room) {
  if (!room) return;
  log('[spin] subtopic start', { room: room.code, topic: room.lastCategory });
  const subs = getSubtopics(room.lastCategory) || [];
  if (subs.length === 0) return;
  const idx = Math.floor(Math.random() * subs.length);
  const sub = subs[idx];
  room.status = 'spinning';
  const rotations = 5;
  const sliceAngle = 360 / Math.max(1, subs.length);
  const finalAngle = 360 - (idx * sliceAngle + sliceAngle / 2);
  broadcastRoom(room, { type: 'spin_start', index: idx, topicKey: sub.key, rotations, finalAngle, topics: subs, stage: 'subtopic' });
  setTimeout(() => {
    room.status = 'generating';
    room.lastSubtopic = sub.key;
    log('[spin] subtopic selected', { room: room.code, subtopic: sub.key });
    startRound(room, room.lastCategory, room.lastSubtopic);
  }, 2200);
}

function simulateBotAnswer(room) {
  const bot = getBot(room);
  if (!bot) return;
  const pid = bot.id;
  if (!pid) return;
  // Simple, friendly canned answers per language
  const lang = bot.learningLanguage || 'English';
  const answer = lang === 'Spanish'
    ? 'Hola, gracias por la información. Puedo ayudar con los próximos pasos. ¿Qué prefieres que hagamos ahora? Intentaré ser claro y colaborar.'
    : 'Hi, thanks for the context. I can propose next steps and help. What do you prefer we do now? I will try to be clear and cooperative.';
  schedule(() => {
    if (room.answers[pid] !== undefined) return; // already answered
    room.answers[pid] = answer;
    broadcastRoom(room, { type: 'answer_received', playerId: pid });
    maybeResolveRound(room);
  }, 1200);
}

function genRoomCode() {
  // 4-letter code
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

function broadcastRoom(room, data) {
  const payload = JSON.stringify(data);
  for (const p of Object.values(room.players)) {
    if (p.ws && p.ws.readyState === 1) p.ws.send(payload);
  }
}

function roomSnapshot(room) {
  return {
    type: 'state',
    roomCode: room.code,
    round: room.round,
    status: room.status,
    turn: room.turn || null,
    lastCategory: room.lastCategory || null,
    lastSubtopic: room.lastSubtopic || null,
    stage: room.stage || 'topic',
    cooldownEndsAt: room.cooldownEndsAt || null,
    players: Object.values(room.players).map((p) => ({
      id: p.id,
      name: p.name,
      learningLanguage: p.learningLanguage,
      nativeLanguage: p.nativeLanguage,
      life: p.life,
      cards: p.cards || [],
      aiAssistReady: !!p.aiAssistReady,
      connected: p.ws?.readyState === 1,
    })),
    prompts: room.prompts,
    lastResults: room.lastResults || null,
    history: (room.history || []).slice(-50),
    topics: room.stage === 'subtopic' && room.lastCategory ? getSubtopics(room.lastCategory) : TOPICS,
  };
}

function startRound(room, categoryKey, subtopicKey) {
  log('[round] start', { room: room.code, categoryKey, subtopicKey });
  room.round += 1;
  room.status = 'playing';
  room.answers = {};
  room.lastResults = null;
  room.lastCategory = categoryKey || room.lastCategory || 'work-conversation';
  room.lastSubtopic = subtopicKey || room.lastSubtopic || null;
  room.stage = 'topic';

  // Every 3 rounds, grant a random card to each player
  if (room.round % 3 === 0) {
    for (const pid of Object.keys(room.players)) {
      room.players[pid].cards = room.players[pid].cards || [];
      const card = randomCard();
      room.players[pid].cards.push(card);
      log('[cards] granted', { room: room.code, playerId: pid, card: card.type });
    }
    broadcastRoom(room, { type: 'cards_granted', round: room.round });
  }

  const prompts = {};
  for (const pid of Object.keys(room.players)) {
    const player = room.players[pid];
    // Generate per selected category and target language
    prompts[pid] = null; // placeholder, fill asynchronously
  }
  room.prompts = prompts;
  broadcastRoom(room, { type: 'round_start', round: room.round, category: room.lastCategory, subtopic: room.lastSubtopic });
  // Generate prompts asynchronously and then broadcast when ready,
  // with a safety fallback to avoid indefinite waiting.
  let sent = false;
  const safetyMs = Number(process.env.PROMPT_FALLBACK_MS || 9000);

  const finishAndBroadcast = (entries) => {
    if (sent) return;
    for (const [pid, prompt] of entries) {
      room.prompts[pid] = prompt;
    }
    sent = true;
    broadcastRoom(room, { type: 'prompts_ready', round: room.round, prompts: room.prompts, category: room.lastCategory, subtopic: room.lastSubtopic });
    broadcastRoom(room, roomSnapshot(room));
    log('[round] prompts_ready', { room: room.code, round: room.round });
    if (hasBot(room)) simulateBotAnswer(room);
  };

  const safetyTimer = setTimeout(() => {
    try {
      log('[round] safety_fallback', { room: room.code, round: room.round });
      const entries = Object.keys(room.players).map((pid) => {
        const player = room.players[pid];
        const prompt = room.prompts[pid] || mockExercise({ topicKey: room.lastCategory, subtopicKey: room.lastSubtopic, targetLanguage: player.learningLanguage });
        return [pid, prompt];
      });
      finishAndBroadcast(entries);
    } catch {}
  }, safetyMs);

  Promise.all(Object.keys(room.players).map(async (pid) => {
    const player = room.players[pid];
    const prompt = await exerciseGen.generatePrompt({ topicKey: room.lastCategory, subtopicKey: room.lastSubtopic, targetLanguage: player.learningLanguage });
    return [pid, prompt];
  })).then((entries) => {
    clearTimeout(safetyTimer);
    finishAndBroadcast(entries);
  }).catch(() => {
    clearTimeout(safetyTimer);
    log('[round] generate_prompt_error_fallback', { room: room.code, round: room.round });
    const entries = Object.keys(room.players).map((pid) => {
      const player = room.players[pid];
      const prompt = mockExercise({ topicKey: room.lastCategory, subtopicKey: room.lastSubtopic, targetLanguage: player.learningLanguage });
      return [pid, prompt];
    });
    finishAndBroadcast(entries);
  });
}

async function maybeResolveRound(room) {
  const playerIds = Object.keys(room.players);
  // Only resolve rounds when exactly two players are present
  if (playerIds.length !== 2) return;
  if (!playerIds.every((id) => room.answers[id] !== undefined)) return; // wait until both answered

  // Notify clients that evaluation is starting
  broadcastRoom(room, { type: 'evaluating', round: room.round });

  const results = {};
  // Evaluate both answers
  for (const pid of playerIds) {
    const player = room.players[pid];
    const answer = room.answers[pid] || '';
    const prompt = room.prompts[pid] || '';
    try {
      const ev = await evaluator.evaluate({
        prompt,
        answer,
        targetLanguage: player.learningLanguage,
      });
      results[pid] = ev;
    } catch (e) {
      results[pid] = { score: 0, feedback: 'Evaluation failed', corrections: null, raw: String(e) };
    }
  }

  // Apply damage: each player's score damages the opponent
  const [p1, p2] = playerIds;
  const damageFromP1 = Math.max(0, Math.round((results[p1].score || 0) / 5)); // 0-20 damage
  const damageFromP2 = Math.max(0, Math.round((results[p2].score || 0) / 5));

  room.players[p2].life = Math.max(0, room.players[p2].life - damageFromP1);
  room.players[p1].life = Math.max(0, room.players[p1].life - damageFromP2);

  const over = room.players[p1].life <= 0 || room.players[p2].life <= 0;
  room.lastResults = { results, damage: { [p1]: damageFromP2, [p2]: damageFromP1 } };

  // Append to room history
  room.history = room.history || [];
  for (const pid of playerIds) {
    room.history.push({
      round: room.round,
      playerId: pid,
      prompt: room.prompts[pid] || '',
      answer: room.answers[pid] || '',
      score: results[pid]?.score ?? 0,
      feedback: results[pid]?.feedback || '',
      corrections: results[pid]?.corrections || null,
      language: room.players[pid]?.learningLanguage || '',
    });
  }

  broadcastRoom(room, { type: 'round_result', round: room.round, ...room.lastResults, lives: {
    [p1]: room.players[p1].life,
    [p2]: room.players[p2].life,
  }});
  broadcastRoom(room, roomSnapshot(room));

  if (over) {
    const winner = room.players[p1].life > 0 ? p1 : room.players[p2].life > 0 ? p2 : null;
    room.status = 'finished';
    broadcastRoom(room, { type: 'game_over', winner, lives: { [p1]: room.players[p1].life, [p2]: room.players[p2].life } });
    return;
  }

  // Start cooldown window before next spin
  startCooldown(room);
}

function endCooldown(room) {
  if (!room || room.status !== 'cooldown') return;
  room.status = 'waiting_spin';
  room.cooldownEndsAt = null;
  room.skip = {};
  if (room.cooldownTimer) { clearTimeout(room.cooldownTimer); room.cooldownTimer = null; }
  room.turn = room.turn === 'p1' ? 'p2' : 'p1';
  room.stage = 'topic';
  broadcastRoom(room, { type: 'turn', playerId: room.turn, topics: TOPICS, stage: 'topic' });
  broadcastRoom(room, roomSnapshot(room));
  // If bot's turn, auto spin
  if (hasBot(room) && room.turn === 'p2') schedule(() => simulateSpinTopic(room), 700);
}

function startCooldown(room) {
  room.status = 'cooldown';
  room.skip = {};
  const durationMs = Number(process.env.COOLDOWN_MS || 30000);
  room.cooldownEndsAt = Date.now() + durationMs;
  broadcastRoom(room, { type: 'cooldown_start', endsAt: room.cooldownEndsAt, seconds: Math.ceil(durationMs / 1000) });
  broadcastRoom(room, roomSnapshot(room));
  if (room.cooldownTimer) clearTimeout(room.cooldownTimer);
  room.cooldownTimer = setTimeout(() => endCooldown(room), durationMs);
}

wss.on('connection', (ws) => {
  const player = { id: null, name: null, learningLanguage: 'English', life: 100, ws };
  let room = null;

  function send(data) {
    if (ws.readyState === 1) ws.send(JSON.stringify(data));
  }

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === 'create_room') {
      log('[ws] create_room request');
      // Create new room and join as P1
      const code = (() => {
        let c; do { c = genRoomCode(); } while (rooms.has(c)); return c;
      })();
      const pId = 'p1';
      player.id = pId;
      player.name = msg.name?.slice(0, 20) || 'Player 1';
      player.learningLanguage = msg.learningLanguage || 'English';
      player.nativeLanguage = msg.nativeLanguage || (player.learningLanguage === 'English' ? 'Spanish' : 'English');
      player.life = 100;

      room = { code, players: { [pId]: player }, status: 'waiting', round: 0, prompts: {}, answers: {}, turn: null, lastCategory: null, lastSubtopic: null, history: [], stage: 'topic' };
      rooms.set(code, room);
      // If AUTO_BOT is enabled, auto-join a bot as P2 and start the game
      if (AUTO_BOT) {
        const botId = 'p2';
        const botLearn = player.learningLanguage === 'English' ? 'Spanish' : 'English';
        const botNative = botLearn === 'English' ? 'Spanish' : 'English';
        room.players[botId] = { id: botId, name: 'Bot', learningLanguage: botLearn, nativeLanguage: botNative, life: 100, ws: null, isBot: true };
        room.turn = Math.random() < 0.5 ? 'p1' : 'p2';
        room.status = 'waiting_spin';
        room.stage = 'topic';
        broadcastRoom(room, { type: 'turn', playerId: room.turn, topics: TOPICS, stage: 'topic' });
        broadcastRoom(room, roomSnapshot(room));
        if (room.turn === 'p2') schedule(() => simulateSpinTopic(room), 700);
      }
      send({ type: 'room_created', roomCode: code, playerId: pId });
      send(roomSnapshot(room));
      return;
    }

    if (msg.type === 'join_room') {
      log('[ws] join_room request', { roomCode: msg.roomCode });
      const { roomCode } = msg;
      const existing = rooms.get(roomCode);
      if (!existing) return send({ type: 'error', error: 'Room not found' });
      if (Object.keys(existing.players).length >= 2) return send({ type: 'error', error: 'Room full' });

      const pId = existing.players.p1 ? 'p2' : 'p1';
      player.id = pId;
      player.name = msg.name?.slice(0, 20) || (pId === 'p1' ? 'Player 1' : 'Player 2');
      player.learningLanguage = msg.learningLanguage || 'Spanish';
      player.nativeLanguage = msg.nativeLanguage || (player.learningLanguage === 'English' ? 'Spanish' : 'English');
      player.life = 100;
      room = existing;
      room.players[pId] = player;

      send({ type: 'room_joined', roomCode, playerId: pId });
      broadcastRoom(room, roomSnapshot(room));

      // If two players, start game
      if (Object.keys(room.players).length === 2) {
        // Set initial turn randomly, wait for spin
        room.turn = Math.random() < 0.5 ? 'p1' : 'p2';
        room.status = 'waiting_spin';
        room.stage = 'topic';
        log('[room] ready_for_spin', { room: room.code, turn: room.turn });
        broadcastRoom(room, { type: 'turn', playerId: room.turn, topics: TOPICS, stage: 'topic' });
        broadcastRoom(room, roomSnapshot(room));
        if (hasBot(room) && room.turn === 'p2') schedule(() => simulateSpinTopic(room), 700);
      }
      return;
    }

    if (msg.type === 'answer' && room && player.id) {
      log('[ws] answer', { room: room.code, playerId: player.id, len: (msg.text || '').length });
      const text = (msg.text || '').slice(0, 2000);
      room.answers[player.id] = text;
      broadcastRoom(room, { type: 'answer_received', playerId: player.id });
      // When both answered, evaluate
      maybeResolveRound(room);
      return;
    }

    // Use a card
    if (msg.type === 'use_card' && room && player.id) {
      const pid = player.id;
      room.players[pid].cards = room.players[pid].cards || [];
      const cards = room.players[pid].cards;
      const idx = cards.findIndex((c) => c.id === msg.cardId);
      if (idx === -1) return; // not found
      const card = cards[idx];
      // Validate phase
      const phase = room.status;
      if (card.useDuring === 'playing' && phase !== 'playing') return;
      // Apply effect
      if (card.type === 'heal_small') {
        const before = room.players[pid].life;
        room.players[pid].life = Math.min(100, before + 10);
        log('[cards] heal_small', { room: room.code, playerId: pid, from: before, to: room.players[pid].life });
        broadcastRoom(room, { type: 'card_used', playerId: pid, effect: 'heal_small', life: room.players[pid].life });
      } else if (card.type === 'reroll_prompt') {
        const targetLang = room.players[pid].learningLanguage || 'English';
        log('[cards] reroll_prompt', { room: room.code, playerId: pid });
        try {
          const newPrompt = await exerciseGen.generatePrompt({ topicKey: room.lastCategory, subtopicKey: room.lastSubtopic, targetLanguage: targetLang });
          room.prompts[pid] = newPrompt;
          broadcastRoom(room, { type: 'prompt_updated', playerId: pid, prompt: newPrompt });
          broadcastRoom(room, roomSnapshot(room));
        } catch {
          const fallback = mockExercise({ topicKey: room.lastCategory, subtopicKey: room.lastSubtopic, targetLanguage: targetLang });
          room.prompts[pid] = fallback;
          broadcastRoom(room, { type: 'prompt_updated', playerId: pid, prompt: fallback });
          broadcastRoom(room, roomSnapshot(room));
        }
      } else if (card.type === 'ai_assist') {
        room.players[pid].aiAssistReady = true;
        log('[cards] ai_assist ready', { room: room.code, playerId: pid });
        broadcastRoom(room, { type: 'ai_assist_ready', playerId: pid });
      }
      // consume the card
      cards.splice(idx, 1);
      room.players[pid].cards = cards;
      broadcastRoom(room, roomSnapshot(room));
      return;
    }

    // Request AI-generated answer (only if aiAssistReady)
    if (msg.type === 'ai_answer_request' && room && player.id) {
      const pid = player.id;
      if (!room.players[pid].aiAssistReady) return;
      const prompt = room.prompts[pid] || '';
      const lang = room.players[pid].learningLanguage || 'English';
      log('[ai] answer_request', { room: room.code, playerId: pid });
      try {
        const text = await generateAIAnswer({ prompt, targetLanguage: lang });
        room.players[pid].aiAssistReady = false;
        broadcastRoom(room, { type: 'ai_answer', playerId: pid, text });
        broadcastRoom(room, roomSnapshot(room));
      } catch {
        const text = mockAIAnswer({ prompt, targetLanguage: lang });
        room.players[pid].aiAssistReady = false;
        broadcastRoom(room, { type: 'ai_answer', playerId: pid, text });
        broadcastRoom(room, roomSnapshot(room));
      }
      return;
    }

    if (msg.type === 'skip' && room && player.id) {
      log('[ws] skip', { room: room.code, playerId: player.id });
      if (room.status !== 'cooldown') return;
      room.skip = room.skip || {};
      room.skip[player.id] = true;
      broadcastRoom(room, { type: 'skip_update', players: Object.keys(room.skip) });
      const twoPlayers = Object.keys(room.players).length === 2;
      const bothSkipped = twoPlayers && room.skip.p1 && room.skip.p2;
      if (bothSkipped) endCooldown(room);
      return;
    }

    // Turn-based spinner (two-stage: topic then subtopic)
    if (msg.type === 'spin' && room && player.id) {
      log('[ws] spin', { room: room.code, playerId: player.id, status: room.status, stage: room.stage });
      if (room.status !== 'waiting_spin' && room.status !== 'waiting_subspin') return; // not time to spin
      if (room.turn !== player.id) return; // not your turn
      const stage = room.stage || 'topic';
      if (stage === 'topic') {
        const list = TOPICS;
        const idx = Math.floor(Math.random() * list.length);
        const topic = list[idx];
        room.status = 'spinning';
        const rotations = 5;
        const sliceAngle = 360 / list.length;
        const finalAngle = 360 - (idx * sliceAngle + sliceAngle / 2);
        broadcastRoom(room, { type: 'spin_start', index: idx, topicKey: topic.key, rotations, finalAngle, topics: list, stage: 'topic' });
        setTimeout(() => {
          room.lastCategory = topic.key;
          // move to subtopic stage, same player's turn
          room.status = 'waiting_subspin';
          room.stage = 'subtopic';
          const subs = getSubtopics(topic.key);
          broadcastRoom(room, { type: 'turn', playerId: room.turn, topics: subs, stage: 'subtopic' });
          broadcastRoom(room, roomSnapshot(room));
          if (hasBot(room) && room.turn === 'p2') schedule(() => simulateSpinSubtopic(room), 700);
        }, 2200);
      } else if (stage === 'subtopic') {
        const subs = getSubtopics(room.lastCategory) || [];
        const idx = Math.floor(Math.random() * subs.length);
        const sub = subs[idx];
        room.status = 'spinning';
        const rotations = 5;
        const sliceAngle = 360 / Math.max(1, subs.length);
        const finalAngle = 360 - (idx * sliceAngle + sliceAngle / 2);
        broadcastRoom(room, { type: 'spin_start', index: idx, topicKey: sub.key, rotations, finalAngle, topics: subs, stage: 'subtopic' });
        setTimeout(() => {
          room.status = 'generating';
          room.lastSubtopic = sub.key;
          startRound(room, room.lastCategory, room.lastSubtopic);
        }, 2200);
      }
      return;
    }

    if (msg.type === 'state') {
      if (room) send(roomSnapshot(room));
      return;
    }
  });

  ws.on('close', () => {
    if (!room || !player.id) return;
    // Mark disconnected, end game if only one left
    const otherId = player.id === 'p1' ? 'p2' : 'p1';
    if (room.players[otherId]) {
      room.status = 'finished';
      broadcastRoom(room, { type: 'opponent_disconnected', playerId: player.id });
    }
    // Cleanup room after short delay
    setTimeout(() => {
      if (rooms.get(room.code) === room) rooms.delete(room.code);
    }, 30000);
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Language Duel listening on http://localhost:${PORT}`);
});

// --- AI Assist generation (server-side) ---
import fetch from 'node-fetch';
const _fetch2 = globalThis.fetch || fetch;
function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label || 'Operation'} timed out after ${ms}ms`)), ms);
    promise.then((v) => { clearTimeout(id); resolve(v); }, (e) => { clearTimeout(id); reject(e); });
  });
}
async function generateAIAnswer({ prompt, targetLanguage }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');
  const model = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1:free';
  const system = 'You craft an excellent, natural reply in the target language for the given conversational prompt. Keep it concise (3-5 lines), coherent, and appropriate. Return only the reply text.';
  const user = `Target language: ${targetLanguage}\nPrompt: ${prompt}\nWrite the reply as if you were the learner.`;
  const controller = new AbortController();
  const timeoutMs = Number(process.env.AI_ASSIST_TIMEOUT_MS || 8000);
  const res = await withTimeout(_fetch2('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.OPENROUTER_REFERRER || 'http://localhost',
      'X-Title': 'Language Duel AI Assist',
    },
    body: JSON.stringify({ model, temperature: 0.3, messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ] }),
    signal: controller.signal,
  }), timeoutMs, 'AI assist');
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI assist error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || '';
}

function mockAIAnswer({ prompt, targetLanguage }) {
  const text = targetLanguage === 'Spanish'
    ? 'B: Gracias por la información. Propongo aclarar dudas, confirmar plazos y colaborar en una solución. ¿Te parece si empiezo por...'
    : 'B: Thanks for the context. I suggest clarifying the main points, proposing next steps, and confirming timing. Does that work for you?';
  return text;
}
