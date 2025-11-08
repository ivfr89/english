import fetch from 'node-fetch';

// Lazy polyfill for Node 18+ global fetch; fallback to node-fetch if needed.
const _fetch = globalThis.fetch || fetch;

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1:free';

function buildSystemPrompt() {
  return (
    'You are an expert language examiner. Evaluate the learner\'s answer for the target language strictly. ' +
    'Return a JSON object with keys: score (0-100 integer), feedback (1-2 sentences), corrections (string with minimal corrections). ' +
    'Focus on grammar, vocabulary, coherence, and appropriateness for the prompt. Do NOT include any extra text beyond JSON.'
  );
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label || 'Operation'} timed out after ${ms}ms`)), ms);
    promise.then((v) => { clearTimeout(id); resolve(v); }, (e) => { clearTimeout(id); reject(e); });
  });
}

async function openrouterEvaluate({ prompt, answer, targetLanguage }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');
  const body = {
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: `Target language: ${targetLanguage}\nPrompt: ${prompt}\nAnswer: ${answer}\nReturn ONLY JSON.` },
    ],
    temperature: 0.2,
  };
  const controller = new AbortController();
  const timeoutMs = Number(process.env.EVAL_TIMEOUT_MS || 10000);
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
  const content = data?.choices?.[0]?.message?.content || '{}';
  let parsed;
  try { parsed = JSON.parse(content); } catch { parsed = {}; }
  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
  return {
    score,
    feedback: parsed.feedback || 'No feedback',
    corrections: parsed.corrections || null,
    raw: content,
  };
}

function mockEvaluate({ prompt, answer, targetLanguage }) {
  // Simple heuristic: length and keyword overlap
  const targetLen = Math.min(200, prompt.length / 2 + 30);
  const lenScore = Math.max(0, Math.min(60, Math.floor((answer.length / targetLen) * 60)));
  const keyword = (prompt.split(/\W+/).find((w) => w.length > 6) || '').toLowerCase();
  const keyScore = answer.toLowerCase().includes(keyword) ? 20 : 0;
  const fluency = /[.!?]$/.test(answer.trim()) ? 20 : 10;
  const score = Math.max(0, Math.min(100, lenScore + keyScore + fluency));
  return {
    score,
    feedback: `Mock evaluation in ${targetLanguage}. Aim for clarity and more detail.`,
    corrections: null,
    raw: null,
  };
}

export function createEvaluator() {
  const mode = process.env.EVAL_MODE || (process.env.OPENROUTER_API_KEY ? 'openrouter' : 'mock');
  const evaluate = async (payload) => {
    if (mode === 'openrouter') return openrouterEvaluate(payload);
    return mockEvaluate(payload);
  };
  return { evaluate, mode };
}
