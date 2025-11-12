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

export function getHints(topicKey, subtopicKey, nativeLanguage = 'Spanish') {
  // Lightweight, generic hints per topic; localized English/Spanish
  const H = {
    'work-conversation': {
      English: [
        'Tip: Be clear and propose a plan.',
        'Add a polite tone and next steps.',
      ],
      Spanish: [
        'Consejo: Sé claro y propone un plan.',
        'Usa un tono cordial y próximos pasos.',
      ],
    },
    'customer-support': {
      English: [ 'Tip: Empathize and offer a solution.', 'Ask a clarifying question if needed.' ],
      Spanish: [ 'Consejo: Empatiza y propone una solución.', 'Haz una pregunta aclaratoria si hace falta.' ],
    },
    'travel-conversation': {
      English: [ 'Tip: Be polite and specific.', 'Mention time/place details.' ],
      Spanish: [ 'Consejo: Sé educado y específico.', 'Menciona detalles de tiempo/lugar.' ],
    },
    'friend-chat': {
      English: [ 'Tip: Keep a friendly tone.', 'Confirm availability and suggest an option.' ],
      Spanish: [ 'Consejo: Mantén un tono amistoso.', 'Confirma disponibilidad y sugiere una opción.' ],
    },
    'interview': {
      English: [ 'Tip: Be concise and concrete.', 'Mention 1 example and result.' ],
      Spanish: [ 'Consejo: Sé conciso y concreto.', 'Menciona 1 ejemplo y resultado.' ],
    },
    'negotiation': {
      English: [ 'Tip: Offer trade-offs.', 'Be clear about constraints.' ],
      Spanish: [ 'Consejo: Ofrece compensaciones.', 'Sé claro con las limitaciones.' ],
    },
  };
  const arr = (H[topicKey]?.[nativeLanguage]) || (H[topicKey]?.English) || [];
  return arr.join(' ');
}

async function openrouterExercise({ topicKey, subtopicKey, targetLanguage, difficulty = 'medium' }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');
  const model = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1:free';
  const topicLabelEn = getLabel(topicKey, 'English');
  const subLabelEn = (getSubtopics(topicKey).find(s => s.key === subtopicKey)?.labels?.English) || '';
  const system = 'You generate realistic conversational scenarios for language practice. Output ONLY the prompt text in the target language, no extra commentary.';
  // Randomly choose a complex format to increase variety
  const modes = ['dialogue', 'forum', 'podcast'];
  const pick = modes[Math.floor(Math.random() * modes.length)];
  let user;
  if (pick === 'forum') {
    user = `Create a ${difficulty} forum thread exercise in ${targetLanguage}. Category: ${topicLabelEn}${subLabelEn ? ` / ${subLabelEn}` : ''}.
Instructions:
- Start with a Context section summarizing the situation in 1–2 sentences.
- Then show 2–3 short posts with usernames, e.g., "@Ana:" and "@Luis:" that discuss the topic.
- Ask the learner to write a reply as "@Tú:" in ${targetLanguage}, 2–4 lines, referencing the context.
Output ONLY the thread, for example:
"Context: ...\n@Ana: ...\n@Luis: ...\n@Tú: (write your reply)"`;
  } else if (pick === 'podcast') {
    user = `Create a ${difficulty} podcast transcript exercise in ${targetLanguage}. Category: ${topicLabelEn}${subLabelEn ? ` / ${subLabelEn}` : ''}.
Instructions:
- Start with a Context section (1 sentence) describing the episode segment.
- Then include a short transcript with 2–3 exchanges labeled "Host:" and "Guest:".
- Ask the learner to respond as "Guest:" in ${targetLanguage}, 2–4 lines, coherent with the context.
Output ONLY the transcript, for example:
"Context: ...\nHost: ...\nGuest: ...\nHost: ...\nGuest: (continue with your answer)"`;
  } else {
    user = `Create a ${difficulty} conversational exercise in ${targetLanguage}. Category: ${topicLabelEn}${subLabelEn ? ` / ${subLabelEn}` : ''}.
Instructions:
- Provide a Context section (1 sentence) and then a short conversation starter from "A:".
- Ask the learner to reply as "B:" in ${targetLanguage}, 2–4 lines, natural and coherent.
- Ensure the reply should consider the context.
Output ONLY the scenario, for example:
"Context: ...\nA: ...\nRespond as B: ..."`;
  }
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
  // Choose a format: simple dialogue, forum thread, or podcast transcript
  const variant = ['dialogue', 'forum', 'podcast'][Math.floor(Math.random() * 3)];
  const lang = targetLanguage === 'Spanish' ? 'es' : 'en';
  const sub = (getSubtopics(topicKey).find(s => s.key === subtopicKey)?.labels?.[targetLanguage]) || null;

  const samples = {
    dialogue: {
      en: 'Context: You and a coworker discuss a deadline.\nA: "We need a clear plan to deliver by Friday. What do you suggest?"\nRespond as B with 2–4 lines in English.',
      es: 'Contexto: Hablas con un compañero sobre una entrega.\nA: "Necesitamos un plan claro para entregar el viernes. ¿Qué propones?"\nResponde como B con 2–4 líneas en español.',
    },
    forum: {
      en: 'Context: A user asks how to handle a delayed shipment to a customer.\n@Ana: I usually apologize and offer a small discount.\n@Luis: Ask for the order number first and check status.\n@You: (write a 2–4 line reply in English referencing the context)',
      es: 'Contexto: Un usuario pregunta cómo manejar un envío retrasado con un cliente.\n@Ana: Suelo disculparme y ofrecer un pequeño descuento.\n@Luis: Pide primero el número de pedido y revisa el estado.\n@Tú: (escribe una respuesta de 2–4 líneas en español haciendo referencia al contexto)',
    },
    podcast: {
      en: 'Context: A podcast segment on planning a team offsite.\nHost: Many teams feel disconnected lately.\nGuest: A clear agenda and budget help.\nHost: What would you prioritize first?\nGuest: (continue with a 2–4 line answer in English consistent with the context)',
      es: 'Contexto: Un segmento de podcast sobre planear un offsite de equipo.\nHost: Muchos equipos se sienten desconectados últimamente.\nInvitado: Una agenda clara y presupuesto ayudan.\nHost: ¿Qué priorizarías primero?\nInvitado: (continúa con una respuesta de 2–4 líneas en español coherente con el contexto)',
    },
  };
  let base;
  if (variant === 'forum') base = samples.forum[lang];
  else if (variant === 'podcast') base = samples.podcast[lang];
  else base = samples.dialogue[lang];
  return sub ? `${base}\n(${targetLanguage === 'Spanish' ? 'Subtema' : 'Subtopic'}: ${sub})` : base;
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
