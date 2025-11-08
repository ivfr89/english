import fetch from 'node-fetch';
const _fetch = globalThis.fetch || fetch;

// Topics with localized labels for the spinner and UI
export const TOPICS = [
  {
    key: 'work-conversation',
    labels: { English: 'Work conversation', Spanish: 'Conversación de trabajo' },
    subs: [
      { key: 'standup', labels: { English: 'Daily standup', Spanish: 'Reunión diaria' } },
      { key: 'deadline', labels: { English: 'Deadline planning', Spanish: 'Planificación de entrega' } },
      { key: 'feedback', labels: { English: 'Giving feedback', Spanish: 'Dar feedback' } },
      { key: 'conflict', labels: { English: 'Resolving conflict', Spanish: 'Resolver conflictos' } },
    ],
  },
  {
    key: 'customer-support',
    labels: { English: 'Customer support', Spanish: 'Atención al cliente' },
    subs: [
      { key: 'refund', labels: { English: 'Refund request', Spanish: 'Solicitud de reembolso' } },
      { key: 'delay', labels: { English: 'Delivery delay', Spanish: 'Retraso de entrega' } },
      { key: 'damage', labels: { English: 'Damaged product', Spanish: 'Producto dañado' } },
      { key: 'followup', labels: { English: 'Follow-up', Spanish: 'Seguimiento' } },
    ],
  },
  {
    key: 'travel-conversation',
    labels: { English: 'Travel conversation', Spanish: 'Conversación de viaje' },
    subs: [
      { key: 'hotel', labels: { English: 'Hotel check-in', Spanish: 'Check-in de hotel' } },
      { key: 'directions', labels: { English: 'Asking directions', Spanish: 'Preguntar direcciones' } },
      { key: 'restaurant', labels: { English: 'Restaurant', Spanish: 'Restaurante' } },
      { key: 'emergency', labels: { English: 'Emergency', Spanish: 'Emergencia' } },
    ],
  },
  {
    key: 'friend-chat',
    labels: { English: 'Friend chat', Spanish: 'Charla con amigo/a' },
    subs: [
      { key: 'invite', labels: { English: 'Invitations', Spanish: 'Invitaciones' } },
      { key: 'plan', labels: { English: 'Making plans', Spanish: 'Hacer planes' } },
      { key: 'apology', labels: { English: 'Apologizing', Spanish: 'Pedir disculpas' } },
      { key: 'celebration', labels: { English: 'Celebrations', Spanish: 'Celebraciones' } },
    ],
  },
  {
    key: 'interview',
    labels: { English: 'Job interview', Spanish: 'Entrevista de trabajo' },
    subs: [
      { key: 'intro', labels: { English: 'Self-introduction', Spanish: 'Presentación' } },
      { key: 'experience', labels: { English: 'Experience', Spanish: 'Experiencia' } },
      { key: 'challenge', labels: { English: 'Challenges', Spanish: 'Desafíos' } },
      { key: 'close', labels: { English: 'Closing questions', Spanish: 'Preguntas finales' } },
    ],
  },
  {
    key: 'negotiation',
    labels: { English: 'Negotiation', Spanish: 'Negociación' },
    subs: [
      { key: 'scope', labels: { English: 'Scope', Spanish: 'Alcance' } },
      { key: 'budget', labels: { English: 'Budget', Spanish: 'Presupuesto' } },
      { key: 'timeline', labels: { English: 'Timeline', Spanish: 'Plazos' } },
      { key: 'tradeoff', labels: { English: 'Trade-offs', Spanish: 'Compromisos' } },
    ],
  },
];

function getLabel(topicKey, language) {
  const t = TOPICS.find((t) => t.key === topicKey);
  return (t?.labels?.[language]) || topicKey;
}

export function getSubtopics(topicKey) {
  const t = TOPICS.find((t) => t.key === topicKey);
  return t?.subs || [];
}

async function openrouterExercise({ topicKey, subtopicKey, targetLanguage, difficulty = 'medium' }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');
  const model = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1:free';
  const topicLabelEn = getLabel(topicKey, 'English');
  const subLabelEn = (getSubtopics(topicKey).find(s => s.key === subtopicKey)?.labels?.English) || '';
  const system = 'You generate realistic conversational scenarios for language practice. Output ONLY the prompt text in the target language, no extra commentary.';
  const user = `Create a ${difficulty} conversational exercise in ${targetLanguage}. Category: ${topicLabelEn}${subLabelEn ? ` / ${subLabelEn}` : ''}.
Instructions:
- Provide a short scenario setup (1 sentence) and a partner line starting with "A:".
- Ask the learner to reply as "B:" in ${targetLanguage}, 2-4 lines, natural and coherent.
- Avoid translations unless the category is explicitly translation (not used here).
Output ONLY the scenario and partner line, e.g.:
"Context: ...\nA: ...\nRespond as B: ..."`;
  const controller = new AbortController();
  const timeoutMs = Number(process.env.GEN_TIMEOUT_MS || 8000);
  const fetchPromise = _fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.OPENROUTER_REFERRER || 'http://localhost',
      'X-Title': 'Language Duel Exercise',
    },
    body: JSON.stringify({ model, temperature: 0.5, messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ] }),
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
    throw new Error(`OpenRouter exercise error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content?.trim() || '';
  return content;
}

function mockExercise({ topicKey, subtopicKey, targetLanguage }) {
  const examples = {
    'work-conversation': {
      English: 'Context: You and a coworker discuss a deadline.\nA: "We need a clear plan to deliver by Friday. What do you suggest?"\nRespond as B with 2-4 lines in English.',
      Spanish: 'Contexto: Hablas con un compañero sobre una entrega.\nA: "Necesitamos un plan claro para entregar el viernes. ¿Qué propones?"\nResponde como B con 2-4 líneas en español.',
    },
    'customer-support': {
      English: 'Context: A customer reports an issue with their order.\nA: "Hi, my package arrived damaged. Can you help me?"\nRespond as B with 2-4 lines in English, empathetic and helpful.',
      Spanish: 'Contexto: Un cliente reporta un problema con su pedido.\nA: "Hola, mi paquete llegó dañado. ¿Me pueden ayudar?"\nResponde como B con 2-4 líneas en español, empático y resolutivo.',
    },
    'travel-conversation': {
      English: 'Context: You ask for local recommendations while traveling.\nA: "Welcome! What kind of places do you want to visit?"\nRespond as B with 2-4 lines in English.',
      Spanish: 'Contexto: Pides recomendaciones locales durante un viaje.\nA: "¡Bienvenido! ¿Qué tipo de lugares quieres visitar?"\nResponde como B con 2-4 líneas en español.',
    },
    'friend-chat': {
      English: 'Context: A friend invites you to an event this weekend.\nA: "There is a concert on Saturday evening. Are you in?"\nRespond as B with 2-4 lines in English.',
      Spanish: 'Contexto: Un amigo te invita a un evento este fin de semana.\nA: "Hay un concierto el sábado por la tarde. ¿Te apuntas?"\nResponde como B con 2-4 líneas en español.',
    },
    'interview': {
      English: 'Context: Job interview.\nA: "Can you describe a challenging project and your role?"\nRespond as B with 2-4 lines in English.',
      Spanish: 'Contexto: Entrevista de trabajo.\nA: "¿Puedes describir un proyecto desafiante y tu rol?"\nResponde como B con 2-4 líneas en español.',
    },
    'negotiation': {
      English: 'Context: Negotiating project scope with a client.\nA: "Could we add an extra feature without changing the deadline?"\nRespond as B with 2-4 lines in English, proposing trade-offs.',
      Spanish: 'Contexto: Negociando alcance de proyecto con un cliente.\nA: "¿Podemos agregar una funcionalidad extra sin cambiar la fecha de entrega?"\nResponde como B con 2-4 líneas en español, proponiendo compromisos.',
    },
  };
  const bundle = examples[topicKey] || examples['work-conversation'];
  const base = bundle?.[targetLanguage] || bundle?.English;
  const sub = (getSubtopics(topicKey).find(s => s.key === subtopicKey)?.labels?.[targetLanguage]) || null;
  return sub ? `${base}\n(Subtema: ${sub})` : base;
}

export function createExerciseGenerator() {
  const mode = process.env.EVAL_MODE || (process.env.OPENROUTER_API_KEY ? 'openrouter' : 'mock');
  async function generatePrompt({ topicKey, subtopicKey, targetLanguage = 'English', difficulty }) {
    if (mode === 'openrouter') {
      try {
        return await openrouterExercise({ topicKey, subtopicKey, targetLanguage, difficulty });
      } catch (e) {
        // fallback to mock on error
        return mockExercise({ topicKey, subtopicKey, targetLanguage });
      }
    }
    return mockExercise({ topicKey, subtopicKey, targetLanguage });
  }
  return { generatePrompt, topics: TOPICS };
}

export { getLabel };
export { mockExercise };
