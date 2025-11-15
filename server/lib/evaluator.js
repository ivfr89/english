import fetch from 'node-fetch';

// Lazy polyfill for Node 18+ global fetch; fallback to node-fetch if needed.
const _fetch = globalThis.fetch || fetch;

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1:free';
const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true';

function buildSystemPrompt() {
  return (
    'You are an expert language examiner. Evaluate the learner\'s answer in the target language using this rubric and return ONLY JSON. ' +
    '\nRubric (weights → total 100):' +
    '\n- Grammar & Spelling (35): subject–verb agreement, tense, articles, prepositions, capitalization; penalize misspellings (e.g., "neccesary" → "necessary").' +
    '\n- Word Choice & Collocations (20): natural phrasing and correct prepositions; penalize errors like "buy to you" → "buy you" / "buy a new book for you".' +
    '\n- Coherence & Fluency (15): clarity, sentence flow, punctuation, and register.' +
    '\n- Task Completion & Context Adherence (30): answers the prompt fully and is consistent with any provided Context or prior conversation (forum thread, transcript, dialogue). Penalize off-topic or contradictions/hallucinations.' +
    '\nScoring: Assign partial points per category (0–category max). Sum and round to an integer 0–100. Minor typos should cause small deductions (1–5), not heavy penalties.' +
    '\nOutput format (JSON only): {"score": <0-100>, "feedback": "1-2 concise sentences in target language (mention 1 strength, 1 key fix)", "corrections": "short list of minimal corrections in target language"}.'
  );
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label || 'Operation'} timed out after ${ms}ms`)), ms);
    promise.then((v) => { clearTimeout(id); resolve(v); }, (e) => { clearTimeout(id); reject(e); });
  });
}

function extractJsonObject(text) {
  if (!text) return null;
  let s = String(text).trim();
  // Strip fenced code blocks if present
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?/i, '').replace(/```$/,'').trim();
  }
  try { return JSON.parse(s); } catch {}
  // Try to find the first JSON object in the string
  const m = s.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch {}
  }
  return null;
}

async function openrouterEvaluate({ prompt, answer, targetLanguage, level }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');
  const body = {
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: `Target language: ${targetLanguage}\nLearner CEFR level: ${level || 'B1-B2'}\nGuidance: Consider this level when judging complexity, expected length, and vocabulary. Be more lenient on advanced structures at lower levels; be stricter at higher levels.\nPrompt (may include Context/Thread/Transcript; the Context may be in the learner's native language):\n${prompt}\n---\nAnswer:\n${answer}\nReturn ONLY JSON (no markdown, no code fences).` },
    ],
    temperature: 0.2
  };
  const controller = new AbortController();
  const timeoutMs = Number(process.env.EVAL_TIMEOUT_MS || 60000);
  const fetchPromise = _fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.OPENROUTER_REFERRER || 'http://localhost',
      'X-Title': 'Language Duel Evaluation',
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetchPromise;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
  clearTimeout(timer);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || '';
  const parsed = extractJsonObject(content);
  if (!parsed || typeof parsed !== 'object') {
    if (DEBUG) console.log('[eval] JSON parse failed');
    return { score: 0, feedback: 'Evaluation failed (invalid JSON from model).', corrections: null, raw: content };
  }
  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score))));
  return {
    score: Number.isFinite(score) ? score : 0,
    feedback: parsed.feedback || 'No feedback',
    corrections: parsed.corrections || null,
    raw: content,
  };
}

function mockEvaluate({ prompt, answer, targetLanguage }) {
  // Heuristic aligned with rubric: length/fluency + small, targeted penalties
  const text = String(answer || '');
  const trimmed = text.trim();
  if (!trimmed) return { score: 0, feedback: targetLanguage === 'Spanish' ? 'Respuesta vacía.' : 'Empty answer.', corrections: null, raw: null };

  const p = String(prompt || '');
  // Expect longer answers when the context is longer
  const targetLen = Math.min(600, Math.max(120, Math.floor(p.length * 0.35 + 40)));
  const lenScore = Math.max(0, Math.min(25, Math.floor((trimmed.length / targetLen) * 25)));
  const fluency = /[.!?]$/.test(trimmed) ? 15 : 8; // encourage punctuation

  // Lightweight penalties for common issues
  const penalties = [];
  if (/\bbuy to (you|u)\b/i.test(trimmed)) penalties.push({ p: 8, corr: targetLanguage === 'Spanish' ? '“buy to you” → “buy you” / “buy a new book for you”.' : '“buy to you” → “buy you” / “buy a new book for you”.' });
  if (/neces+ary|necces+ary/i.test(trimmed)) penalties.push({ p: 4, corr: targetLanguage === 'Spanish' ? '“neccesary” → “necessary”.' : '“neccesary” → “necessary”.' });
  if (/\bi\b/.test(trimmed)) penalties.push({ p: 3, corr: targetLanguage === 'Spanish' ? 'Capitalizar “I”.' : 'Capitalize “I”.' });

  const penaltySum = penalties.reduce((a, x) => a + x.p, 0);
  // Simple context adherence: reward overlap with context keywords if present
  let contextBonus = 0;
  const ctxMatch = p.match(/Context(?:o)?:([\s\S]{0,300})/i);
  if (ctxMatch) {
    const ctx = ctxMatch[1].toLowerCase();
    const words = Array.from(new Set(ctx.split(/[^a-záéíóúüñ]+/i).filter(w => w && w.length >= 4))).slice(0, 8);
    const hits = words.filter(w => trimmed.toLowerCase().includes(w));
    contextBonus = Math.min(30, hits.length * 3);
  }
  let score = Math.max(0, Math.min(100, lenScore + fluency - penaltySum + contextBonus + 30));

  // Build short feedback and corrections in target language
  let feedback;
  if (targetLanguage === 'Spanish') {
    const fixes = penalties.length ? ' Revisa las correcciones clave.' : '';
    feedback = `Buen intento y tono adecuado.${fixes}`;
  } else {
    const fixes = penalties.length ? ' Review the key corrections.' : '';
    feedback = `Good attempt and appropriate tone.${fixes}`;
  }
  const corrections = penalties.length
    ? penalties.map(x => `- ${x.corr}`).join('\n')
    : null;

  return { score, feedback, corrections, raw: null };
}

export function createEvaluator() {
  const mode = 'openrouter';
  const evaluate = async (payload) => {
    return await openrouterEvaluate(payload);
  };
  return { evaluate, mode };
}
