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
    key: 'health-wellness',
    labels: { English: 'Health & wellness', Spanish: 'Salud y bienestar' },
    subs: [
      { key: 'doctor', labels: { English: 'Doctor visit', Spanish: 'Visita al médico' } },
      { key: 'fitness', labels: { English: 'Fitness goals', Spanish: 'Objetivos de ejercicio' } },
      { key: 'nutrition', labels: { English: 'Nutrition', Spanish: 'Nutrición' } },
      { key: 'stress', labels: { English: 'Stress management', Spanish: 'Manejo del estrés' } },
    ],
  },
  {
    key: 'education',
    labels: { English: 'Education', Spanish: 'Educación' },
    subs: [
      { key: 'school', labels: { English: 'School life', Spanish: 'Vida escolar' } },
      { key: 'university', labels: { English: 'University', Spanish: 'Universidad' } },
      { key: 'online', labels: { English: 'Online course', Spanish: 'Curso online' } },
      { key: 'exam', labels: { English: 'Exams', Spanish: 'Exámenes' } },
    ],
  },
  {
    key: 'technology',
    labels: { English: 'Technology', Spanish: 'Tecnología' },
    subs: [
      { key: 'gadgets', labels: { English: 'Gadgets', Spanish: 'Dispositivos' } },
      { key: 'apps', labels: { English: 'Apps', Spanish: 'Aplicaciones' } },
      { key: 'privacy', labels: { English: 'Privacy', Spanish: 'Privacidad' } },
      { key: 'ai', labels: { English: 'AI & tools', Spanish: 'IA y herramientas' } },
    ],
  },
  {
    key: 'shopping',
    labels: { English: 'Shopping', Spanish: 'Compras' },
    subs: [
      { key: 'groceries', labels: { English: 'Groceries', Spanish: 'Supermercado' } },
      { key: 'clothes', labels: { English: 'Clothes', Spanish: 'Ropa' } },
      { key: 'electronics', labels: { English: 'Electronics', Spanish: 'Electrónica' } },
      { key: 'returns', labels: { English: 'Returns', Spanish: 'Devoluciones' } },
    ],
  },
  {
    key: 'sports',
    labels: { English: 'Sports', Spanish: 'Deportes' },
    subs: [
      { key: 'football', labels: { English: 'Football/Soccer', Spanish: 'Fútbol' } },
      { key: 'gym', labels: { English: 'Gym & training', Spanish: 'Gimnasio y entrenamiento' } },
      { key: 'outdoor', labels: { English: 'Outdoor', Spanish: 'Aire libre' } },
      { key: 'injury', labels: { English: 'Injuries', Spanish: 'Lesiones' } },
    ],
  },
  {
    key: 'entertainment',
    labels: { English: 'Entertainment', Spanish: 'Entretenimiento' },
    subs: [
      { key: 'movies', labels: { English: 'Movies/Series', Spanish: 'Cine/Series' } },
      { key: 'music', labels: { English: 'Music', Spanish: 'Música' } },
      { key: 'gaming', labels: { English: 'Gaming', Spanish: 'Videojuegos' } },
      { key: 'events', labels: { English: 'Events', Spanish: 'Eventos' } },
    ],
  },
  {
    key: 'family',
    labels: { English: 'Family & friends', Spanish: 'Familia y amigos' },
    subs: [
      { key: 'plans', labels: { English: 'Plans', Spanish: 'Planes' } },
      { key: 'celebrations', labels: { English: 'Celebrations', Spanish: 'Celebraciones' } },
      { key: 'conflicts', labels: { English: 'Conflicts', Spanish: 'Conflictos' } },
      { key: 'support', labels: { English: 'Support', Spanish: 'Apoyo' } },
    ],
  },
  {
    key: 'daily-life',
    labels: { English: 'Daily life', Spanish: 'Vida diaria' },
    subs: [
      { key: 'chores', labels: { English: 'Chores', Spanish: 'Tareas del hogar' } },
      { key: 'transport', labels: { English: 'Transport', Spanish: 'Transporte' } },
      { key: 'errands', labels: { English: 'Errands', Spanish: 'Gestiones' } },
      { key: 'schedule', labels: { English: 'Schedule', Spanish: 'Agenda' } },
    ],
  },
  {
    key: 'food-cooking',
    labels: { English: 'Food & cooking', Spanish: 'Comida y cocina' },
    subs: [
      { key: 'recipes', labels: { English: 'Recipes', Spanish: 'Recetas' } },
      { key: 'restaurants', labels: { English: 'Restaurants', Spanish: 'Restaurantes' } },
      { key: 'preferences', labels: { English: 'Preferences', Spanish: 'Preferencias' } },
      { key: 'allergies', labels: { English: 'Allergies', Spanish: 'Alergias' } },
    ],
  },
  {
    key: 'finance',
    labels: { English: 'Finance', Spanish: 'Finanzas' },
    subs: [
      { key: 'banking', labels: { English: 'Banking', Spanish: 'Banca' } },
      { key: 'budgeting', labels: { English: 'Budgeting', Spanish: 'Presupuesto' } },
      { key: 'investing', labels: { English: 'Investing', Spanish: 'Inversión' } },
      { key: 'taxes', labels: { English: 'Taxes', Spanish: 'Impuestos' } },
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

function sample(arr, n = 1) {
  const a = arr.slice();
  const out = [];
  while (a.length && out.length < n) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  return out;
}

async function openrouterExercise({ topicKey, subtopicKey, targetLanguage, nativeLanguage, difficulty = 'medium', level = 'B1-B2' }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');
  const model = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1:free';
  const topicLabelEn = getLabel(topicKey, 'English');
  const subLabelEn = (getSubtopics(topicKey).find(s => s.key === subtopicKey)?.labels?.English) || '';
  const system = 'You generate realistic conversational scenarios for language practice. Output ONLY the prompt text in the target language. Never include the learner\'s reply content. The learner line must end with a placeholder like (continue with your answer) and nothing after it.';
  // Diversity knobs and topic-specific facets
  const STYLES = [
    'business professional', 'casual friendly', 'technical product', 'customer service empathetic', 'academic formal', 'startup scrappy', 'interview concise', 'negotiation assertive'
  ];
  function facetsByTopic(key) {
    const common = ['time and place', 'participant roles with names', 'explicit dates', 'prior events', 'constraints or conflicts'];
    const map = {
      'customer-support': [
        'order number and carrier', 'latest tracking scan location', 'original promise date and updated ETA', 'customer tier/policy (e.g., voucher rules)', 'SLA urgency and cause of delay (e.g., seasonal backlog, weather)'
      ],
      'work-conversation': [
        'project name and stakeholders', 'deadline and scope boundaries', 'dependencies or blockers', 'recent meeting decisions', 'risks and trade-offs'
      ],
      'travel-conversation': [
        'city and venue names', 'booking refs (flight/hotel)', 'dates/times of activities', 'transport constraints', 'preferences and budget range'
      ],
      'friend-chat': [
        'relationship and tone', 'schedule constraints', 'location ideas', 'prior commitments', 'weather or event context'
      ],
      'interview': [
        'role and company', 'example project details', 'metrics/outcomes', 'tools/stack', 'challenge and resolution'
      ],
      'negotiation': [
        'objectives and non-negotiables', 'budget range and timeline', 'trade-offs and concessions', 'risks and mitigation', 'decision makers'
      ],
    };
    return (map[key] || common).concat(common);
  }
  const style = sample(STYLES, 1)[0];
  const facets = sample(facetsByTopic(topicKey), 5);
  const diversityCue = Math.random().toString(36).slice(2, 10);
  // Randomly choose a complex format; require longer contexts and include ideal answers
  const modes = ['dialogue', 'forum', 'podcast'];
  const modeChoice = modes[Math.floor(Math.random() * modes.length)];
  // Line length guidance by CEFR level
  function levelLines(lvl) {
    switch ((lvl || '').toUpperCase()) {
      case 'A1-A2': return '2–3';
      case 'A2-B1': return '3–4';
      case 'B1-B2': return '4–6';
      case 'B2-C1': return '5–7';
      case 'C1-C2': return '6–8';
      default: return '4–6';
    }
  }
  const lines = levelLines(level);
  let user;
  if (modeChoice === 'forum') {
    user = `Create a ${difficulty} forum thread exercise. Category: ${topicLabelEn}${subLabelEn ? ` / ${subLabelEn}` : ''}.
Learner CEFR level: ${level}. Adjust vocabulary, structures, and required length to this level.
Instructions:
- Start with a Context section of 4–7 sentences in ${nativeLanguage}, rich in details (${facets.join(', ')}). Use explicit dates (e.g., "2 de diciembre de 2025" / "December 2, 2025"). Use native toponyms (e.g., "Londres" vs "London"). Vary the writing style: ${style}.
- Then show 3–5 short posts with usernames (e.g., "@Ana:", "@Luis:") in ${targetLanguage} that discuss the topic.
- Ask the learner to write a reply as "@Tú:" in ${targetLanguage}, ${lines} lines, referencing the context.
- After the thread, add a section titled "Ideal answers:" with 1–2 strong sample replies in ${targetLanguage}, each ${lines} lines.
- Avoid reusing phrasing from earlier exercises; prefer fresh structures and vocabulary.

Output rules (strict):
- Do NOT include the learner\'s reply content anywhere.
- For the learner line, output exactly one placeholder line and nothing after it, e.g.: "@Tú: (continue with your answer)".
- Do NOT add any continuation lines under the learner line.
- Output only the thread and the "Ideal answers:" section. No extra commentary.
- Use exactly the labels shown (e.g., Context:, @Ana:, @Luis:, @Tú:).
- Diversity cue (do NOT include in output): ${diversityCue}

Example format:
"Context: ...\n@Ana: ...\n@Luis: ...\n@Tú: (continue with your answer)\nIdeal answers:\n- ...\n- ..."`;
  } else if (modeChoice === 'podcast') {
    user = `Create a ${difficulty} podcast transcript exercise. Category: ${topicLabelEn}${subLabelEn ? ` / ${subLabelEn}` : ''}.
Learner CEFR level: ${level}. Adjust vocabulary, structures, and required length to this level.
Instructions:
- Start with a Context section of 4–7 sentences in ${nativeLanguage} describing the episode segment (${facets.join(', ')}). Use explicit dates and native toponyms. Vary the writing style: ${style}.
- Then include a transcript with 3–6 exchanges labeled "Host:" and "Guest:" in ${targetLanguage}.
- Ask the learner to respond as "Guest:" in ${targetLanguage}, ${lines} lines, coherent with the context.
- After the transcript, add a section titled "Ideal answers:" with 1–2 strong sample replies in ${targetLanguage}, each ${lines} lines.
- Avoid reusing phrasing from earlier exercises; prefer fresh structures and vocabulary.

Output rules (strict):
- Do NOT include the learner\'s reply content anywhere.
- For the learner line, output exactly one placeholder line and nothing after it, e.g.: "Guest: (continue with your answer)".
- Do NOT add any continuation lines under the learner line.
- Output only the transcript and the "Ideal answers:" section. No extra commentary.
- Use exactly the labels shown (e.g., Context:, Host:, Guest:).
- Diversity cue (do NOT include in output): ${diversityCue}

Example format:
"Context: ...\nHost: ...\nGuest: ...\nHost: ...\nGuest: (continue with your answer)\nIdeal answers:\n- ...\n- ..."`;
  } else {
    user = `Create a ${difficulty} conversational exercise. Category: ${topicLabelEn}${subLabelEn ? ` / ${subLabelEn}` : ''}.
Learner CEFR level: ${level}. Adjust vocabulary, structures, and required length to this level.
Instructions:
- Provide a Context section (4–7 sentences) in ${nativeLanguage} (include ${facets.join(', ')}; explicit dates; native toponyms), then a short conversation starter from "A:" in ${targetLanguage}. Vary the writing style: ${style}.
- Ask the learner to reply as "B:" in ${targetLanguage}, ${lines} lines, natural and coherent, considering the context.
- After the conversation starter, add a section titled "Ideal answers:" with 1–2 strong sample replies in ${targetLanguage}, each ${lines} lines as "B:".
- Avoid reusing phrasing from earlier exercises; prefer fresh structures and vocabulary.

Output rules (strict):
- Do NOT include the learner\'s reply content anywhere.
- For the learner line, output exactly one placeholder line and nothing after it, e.g.: "B: (continue with your answer)".
- Do NOT add any continuation lines under the learner line.
- Output only the scenario and the "Ideal answers:" section. No extra commentary.
- Use exactly the labels shown (e.g., Context:, A:, B:).
- Diversity cue (do NOT include in output): ${diversityCue}

Example format:
"Context: ...\nA: ...\nB: (continue with your answer)\nIdeal answers:\n- ...\n- ..."`;
  }
  const timeoutMs = Number(process.env.GEN_TIMEOUT_MS || 180000);
  let res;
  const maxAttempts = Math.max(1, Math.min(3, Number(process.env.GEN_RETRIES || 3)));
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const fetchPromise = _fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.OPENROUTER_REFERRER || 'http://localhost',
        'X-Title': 'Language Duel Exercise',
      },
      body: JSON.stringify({ model, temperature: 0.85, top_p: 0.9, messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ] }),
      signal: controller.signal,
    });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      res = await fetchPromise;
      clearTimeout(timer);
      if (res.ok) break;
      const text = await res.text();
      if (attempt === maxAttempts) throw new Error(`OpenRouter exercise error ${res.status}: ${text}`);
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      clearTimeout(timer);
      if (attempt === maxAttempts) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content?.trim() || '';
  return content;
}

function mockExercise({ topicKey, subtopicKey, targetLanguage, nativeLanguage }) {
  // Choose a format: simple dialogue, forum thread, or podcast transcript
  const variant = ['dialogue', 'forum', 'podcast'][Math.floor(Math.random() * 3)];
  const convLang = targetLanguage === 'Spanish' ? 'es' : 'en';
  const ctxLang = nativeLanguage === 'Spanish' ? 'es' : 'en';
  const sub = (getSubtopics(topicKey).find(s => s.key === subtopicKey)?.labels?.[targetLanguage]) || null;
  function formatDate(ctxLang) {
    const d = new Date();
    d.setDate(d.getDate() + (1 + Math.floor(Math.random() * 20)));
    const day = d.getDate();
    const monthNamesEs = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const monthNamesEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const m = ctxLang === 'es' ? monthNamesEs[d.getMonth()] : monthNamesEn[d.getMonth()];
    const y = d.getFullYear();
    return ctxLang === 'es' ? `${day} de ${m} de ${y}` : `${m} ${day}, ${y}`;
  }
  function enrichContext(text) {
    const NAMES_EN = ['Ana', 'Luis', 'Marta', 'Carlos', 'James', 'Priya', 'Lina', 'Marco'];
    const NAMES_ES = NAMES_EN; // shared for simplicity
    const CITIES_EN = ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'London', 'Berlin', 'Mexico City'];
    const CITIES_ES = CITIES_EN;
    const name1 = (ctxLang === 'es' ? NAMES_ES : NAMES_EN)[Math.floor(Math.random()*NAMES_EN.length)];
    const name2 = (ctxLang === 'es' ? NAMES_ES : NAMES_EN)[Math.floor(Math.random()*NAMES_EN.length)];
    const city = (ctxLang === 'es' ? CITIES_ES : CITIES_EN)[Math.floor(Math.random()*CITIES_EN.length)];
    const dateStr = formatDate(ctxLang);
    // Topic-specific enrichment
    let extra;
    if (topicKey === 'customer-support') {
      const carriers = ['DHL','UPS','FedEx','Correos','Royal Mail'];
      const carrier = carriers[Math.floor(Math.random()*carriers.length)];
      const order = `#A${Math.random().toString(36).slice(2,7).toUpperCase()}`;
      extra = ctxLang === 'es'
        ? `\nDetalles: Pedido ${order}. Transportista: ${carrier}. Último escaneo: ${city}. Promesa original: ${dateStr}. Política: cupón 10% si el retraso >72h. Causa: pico de demanda.`
        : `\nDetails: Order ${order}. Carrier: ${carrier}. Last scan: ${city}. Original promise: ${dateStr}. Policy: 10% voucher if delay >72h. Cause: peak demand.`;
    } else if (topicKey === 'work-conversation') {
      const proj = `Project ${Math.random().toString(36).slice(2,5).toUpperCase()}`;
      extra = ctxLang === 'es'
        ? `\nDetalles: Proyecto ${proj}. Stakeholders: ${name1}, ${name2}. Dependencias: proveedor externo. Riesgos: alcance y plazos. Reunión clave: ${dateStr}.`
        : `\nDetails: ${proj}. Stakeholders: ${name1}, ${name2}. Dependencies: external vendor. Risks: scope and timeline. Key meeting: ${dateStr}.`;
    } else if (topicKey === 'travel-conversation') {
      const booking = `REF${Math.floor(100000 + Math.random()*900000)}`;
      extra = ctxLang === 'es'
        ? `\nDetalles: Ciudad: ${city}. Reserva: ${booking}. Actividades: visita guiada ${dateStr}. Restricciones: transporte y horarios.`
        : `\nDetails: City: ${city}. Booking: ${booking}. Activities: guided tour on ${dateStr}. Constraints: transport and schedules.`;
    } else if (topicKey === 'interview') {
      extra = ctxLang === 'es'
        ? `\nDetalles: Rol: Desarrollador. Métricas: +20% rendimiento en ${dateStr.split(' ')[2]}. Stack: Node.js, React. Desafío: deuda técnica.`
        : `\nDetails: Role: Developer. Metrics: +20% performance in ${new Date().getFullYear()}. Stack: Node.js, React. Challenge: technical debt.`;
    } else if (topicKey === 'negotiation') {
      const budget = 10000 + Math.floor(Math.random()*20000);
      extra = ctxLang === 'es'
        ? `\nDetalles: Objetivos: calidad y tiempo. Presupuesto: ~${budget}€. Plazo: ${dateStr}. Concesiones: fasear entregables.`
        : `\nDetails: Objectives: quality and time. Budget: ~£${budget}. Timeline: ${dateStr}. Concessions: phase deliverables.`;
    } else {
      extra = ctxLang === 'es'
        ? `\nDetalles: ${name1} y ${name2} se coordinan desde ${city}. Fecha clave: ${dateStr}.`
        : `\nDetails: ${name1} and ${name2} coordinate from ${city}. Key date: ${dateStr}.`;
    }
    return text.replace(/^(Contexto?:[^\n]*)/m, (m0) => m0 + extra);
  }

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
  function splitSample(str) {
    const i = str.indexOf('\n');
    return i === -1 ? [str, ''] : [str.slice(0, i), str.slice(i + 1)];
  }
  let ctxLine, rest;
  if (variant === 'forum') {
    const [c1] = splitSample(samples.forum[ctxLang]);
    const [, r2] = splitSample(samples.forum[convLang]);
    ctxLine = c1; rest = r2;
  } else if (variant === 'podcast') {
    const [c1] = splitSample(samples.podcast[ctxLang]);
    const [, r2] = splitSample(samples.podcast[convLang]);
    ctxLine = c1; rest = r2;
  } else {
    const [c1] = splitSample(samples.dialogue[ctxLang]);
    const [, r2] = splitSample(samples.dialogue[convLang]);
    ctxLine = c1; rest = r2;
  }
  base = ctxLine + '\n' + rest;
  base = enrichContext(base);
  const ideal1 = convLang === 'es'
    ? '— Entiendo la situación. Primero, lamento los inconvenientes y me comprometo a dar seguimiento. Propongo confirmar el número de pedido, revisar el estado con logística y ofrecer una compensación si corresponde. ¿Te parece si empezamos por verificar el detalle del pedido para darte una fecha clara?'
    : '— I understand the situation. First, I’m sorry for the inconvenience and I’ll follow up. I suggest confirming the order number, checking the status with logistics, and offering a small compensation if appropriate. Shall we start by verifying your order so I can give you a clear date?';
  const ideal2 = convLang === 'es'
    ? '— Gracias por el contexto. Para avanzar, resumiría el problema, confirmaría plazos realistas y acordaría próximos pasos. Si estás de acuerdo, puedo preparar un breve plan con fechas y responsables para que lo revisemos juntos.'
    : '— Thanks for the context. To move forward, I’d summarize the problem, confirm realistic timelines, and agree on next steps. If that works, I can draft a short plan with dates and owners for us to review together.';
  const suffix = `\nIdeal answers:\n- ${ideal1}\n- ${ideal2}`;
  const withSub = sub ? `${base}\n(${targetLanguage === 'Spanish' ? 'Subtema' : 'Subtopic'}: ${sub})` : base;
  return `${withSub}${suffix}`;
}

function sanitizeRawExerciseContent(raw) {
  let s = String(raw || '');
  // Keep any Ideal answers section for parsing later
  const mIdeals = s.match(/\n\s*Ideal answers?:/i);
  const idxIdeals = mIdeals ? mIdeals.index : -1;
  const head = idxIdeals >= 0 ? s.slice(0, idxIdeals) : s;
  const tail = idxIdeals >= 0 ? s.slice(idxIdeals) : '';
  // Redact ONLY the learner's line content, keep the rest of conversation
  const lines = head.split(/\n/);
  const learnerRe = /^\s*(Guest|B|@(?:T[úu]|You))\s*:\s*(.*)$/i;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(learnerRe);
    if (!m) continue;
    const prefix = m[1];
    const content = (m[2] || '').trim();
    const isPlaceholder = /\(.*continue.*\)|\(.*escribe.*\)|\(.*continuar.*\)/i.test(content) || content === '';
    if (!isPlaceholder) {
      lines[i] = `${prefix}: (continue with your answer)`;
    }
  }
  return lines.join('\n') + (tail ? '\n' + tail : '');
}

function parsePromptAndIdeals(text) {
  const s = String(text || '');
  const parts = s.split(/\n\s*Ideal answers?:/i);
  if (parts.length === 1) return { prompt: s.trim(), ideals: [] };
  const prompt = parts[0].trim();
  const tail = parts.slice(1).join('\n');
  const ideals = [];
  tail.split(/\n-\s+/).forEach((line, idx) => {
    const t = (idx === 0 ? line : ('- ' + line)).trim();
    if (!t) return;
    const cleaned = t.replace(/^[-•]\s*/, '').trim();
    if (cleaned) ideals.push(cleaned);
  });
  return { prompt, ideals: ideals.slice(0, 2) };
}

export function createExerciseGenerator() {
  async function generatePrompt({ topicKey, subtopicKey, targetLanguage = 'English', nativeLanguage = 'Spanish', difficulty, level }) {
    // If a CEFR level is provided, use it to steer difficulty/length
    const diff = level ? `CEFR ${level}` : (difficulty || 'medium');
    let raw = await openrouterExercise({ topicKey, subtopicKey, targetLanguage, nativeLanguage, difficulty: diff, level: level || 'B1-B2' });
    raw = sanitizeRawExerciseContent(raw);
    const parsed = parsePromptAndIdeals(raw);
    return { ...parsed, source: 'ai' };
  }
  return { generatePrompt, topics: TOPICS };
}

export { getLabel };
// mockExercise removed: app runs with IA only
